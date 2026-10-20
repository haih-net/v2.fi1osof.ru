import { UserDocument, UserStatusEnum } from '../gql/generated'
import type { FC } from 'react'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client'
import {
  createRequestHandler,
  redirect,
  type LoaderFunction,
  type ServerBuild,
} from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import createApolloClient from '../gql/apolloClient/createApolloClient'
import { useApollo } from '../gql/apolloClient'
import { RequestApolloContext } from '../gql/apolloClient/RequestApolloContext'
import {
  getRequestApollo,
  requestContext,
  requestMiddleware,
} from './context.server'
import { loadRoot } from './rootLoader.server'

vi.mock('../gql/apolloClient/createApolloClient', () => ({ default: vi.fn() }))

const clients: ApolloClient[] = []
const Empty: FC = () => null

beforeEach(() => {
  clients.length = 0
  vi.mocked(createApolloClient).mockReset()
  vi.mocked(createApolloClient).mockImplementation(() => {
    const client = new ApolloClient({
      ssrMode: true,
      link: ApolloLink.empty(),
      cache: new InMemoryCache(),
    })
    vi.spyOn(client, 'stop')
    clients.push(client)
    return client
  })
})

function handler(
  parent: LoaderFunction,
  child: LoaderFunction,
): ReturnType<typeof createRequestHandler> {
  const build: ServerBuild = {
    entry: {
      module: {
        default: (_request, status, _headers, entry, context) => {
          const services = context.get(requestContext)
          if (services.getApolloState()) {
            const Consumer: FC = () => {
              expect(useApollo(undefined, false)).toBe(
                getRequestApollo(context),
              )
              return null
            }
            renderToString(
              createElement(
                RequestApolloContext.Provider,
                { value: services.getApolloClient },
                createElement(Consumer),
              ),
            )
          }
          return Response.json(entry.staticHandlerContext.loaderData, {
            status,
          })
        },
        handleError: vi.fn(),
      },
    },
    routes: {
      root: {
        id: 'root',
        path: '',
        module: {
          default: Empty,
          loader: loadRoot,
          middleware: [requestMiddleware],
        },
      },
      parent: {
        id: 'parent',
        parentId: 'root',
        path: 'parent',
        module: { default: Empty, loader: parent },
      },
      child: {
        id: 'child',
        parentId: 'parent',
        path: 'child',
        module: { default: Empty, loader: child },
      },
    },
    assets: {
      entry: { imports: [], module: '' },
      routes: {},
      url: '',
      version: 'test',
    },
    publicPath: '/',
    assetsBuildDirectory: 'build/client',
    future: {},
    ssr: true,
    isSpaMode: false,
    prerender: [],
    routeDiscovery: { mode: 'initial', manifestPath: '/__manifest' },
  }
  return createRequestHandler(build, 'test')
}

function writeValue(client: ApolloClient, key: string): void {
  client.writeQuery({
    query: UserDocument,
    variables: { where: { id: key } },
    data: {
      object: {
        __typename: 'User',
        id: key,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        sudo: false,
        status: UserStatusEnum.ACTIVE,
        isAiAgent: false,
      },
    },
  })
}

describe('request Apollo context', () => {
  it('does not create a client when loaders do not request it', async () => {
    const response = await handler(
      () => null,
      () => null,
    )(new Request('http://site/parent/child'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      root: {},
    })
    expect(createApolloClient).not.toHaveBeenCalled()
  })

  it('shares one client across concurrent loaders and SSR and serializes the complete cache once', async () => {
    let releaseParent: () => void = () => undefined
    const childFinished = new Promise<void>((resolve) => {
      releaseParent = resolve
    })
    const seen: ApolloClient[] = []
    const handle = handler(
      async ({ context }) => {
        const client = getRequestApollo(context)
        seen.push(client)
        await childFinished
        expect(client.stop).not.toHaveBeenCalled()
        writeValue(client, 'parent')
        return { parent: true }
      },
      ({ context }) => {
        const client = getRequestApollo(context)
        seen.push(client)
        writeValue(client, 'child')
        releaseParent()
        return { child: true }
      },
    )
    const response = await handle(
      new Request('http://site/parent/child', {
        headers: { authorization: 'Bearer first' },
      }),
    )
    expect(response.status).toBe(200)
    expect(seen[0]).toBe(seen[1])
    expect(createApolloClient).toHaveBeenCalledTimes(1)
    expect(createApolloClient).toHaveBeenCalledWith({
      withWs: false,
      appContext: {
        ctx: { req: { headers: { authorization: 'Bearer first' } } },
      },
    })
    const payload = await response.json()
    expect(payload.root.initialApolloState.ROOT_QUERY).toMatchObject({
      'user({"where":{"id":"parent"}})': { __ref: 'User:parent' },
      'user({"where":{"id":"child"}})': { __ref: 'User:child' },
    })
    expect(payload.parent).not.toHaveProperty('initialApolloState')
    expect(payload.child).not.toHaveProperty('initialApolloState')
    expect(clients[0].stop).toHaveBeenCalledTimes(1)
  })

  it('serializes the combined cache for SPA data requests after both loaders finish', async () => {
    const handle = handler(
      async ({ context }) => {
        await Promise.resolve()
        writeValue(getRequestApollo(context), 'parent')
        return null
      },
      ({ context }) => {
        writeValue(getRequestApollo(context), 'child')
        return null
      },
    )
    const response = await handle(new Request('http://site/parent/child.data'))
    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).toContain('initialApolloState')
    expect(body).toContain('User:parent')
    expect(body).toContain('User:child')
    expect(createApolloClient).toHaveBeenCalledTimes(1)
    expect(clients[0].stop).toHaveBeenCalledTimes(1)
  })

  it('isolates clients, authorization and caches between concurrent HTTP requests', async () => {
    const handle = handler(
      async ({ request, context }) => {
        const client = getRequestApollo(context)
        await Promise.resolve()
        writeValue(client, request.headers.get('authorization') ?? '')
        return null
      },
      () => null,
    )
    const responses = await Promise.all(
      ['first', 'second'].map((authorization) =>
        handle(
          new Request('http://site/parent/child', {
            headers: { authorization },
          }),
        ),
      ),
    )
    const bodies = await Promise.all(
      responses.map((response) => response.text()),
    )
    expect(clients).toHaveLength(2)
    expect(clients[0]).not.toBe(clients[1])
    expect(bodies[0]).toContain('first')
    expect(bodies[0]).not.toContain('second')
    expect(bodies[1]).toContain('second')
    expect(bodies[1]).not.toContain('first')
    expect(
      clients.every((client) => vi.mocked(client.stop).mock.calls.length === 1),
    ).toBe(true)
  })

  it.each(['error', 'redirect'])(
    'disposes the client on %s',
    async (outcome) => {
      const handle = handler(
        ({ context }) => {
          getRequestApollo(context)
          if (outcome === 'redirect') {
            throw redirect('/elsewhere')
          }
          throw new Error('Loader failed')
        },
        () => null,
      )
      const response = await handle(new Request('http://site/parent/child'))
      expect(response.status).toBe(outcome === 'redirect' ? 302 : 500)
      expect(clients[0].stop).toHaveBeenCalledTimes(1)
    },
  )
})

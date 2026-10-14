// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from '@apollo/client'
import { useApollo } from 'app/gql/apolloClient'
import { UserStatusEnum } from 'app/gql/generated'
import { AppContextProvider } from './index'
import { useAppContext } from '../../hooks/useAppContext'
import { App } from '../pages/_App'

vi.mock('app/gql/apolloClient', () => ({ useApollo: vi.fn() }))
afterEach(cleanup)

const Consumer: React.FC = () => {
  const { user, userLoading } = useAppContext()
  return <output>{userLoading ? 'loading' : (user?.id ?? 'anonymous')}</output>
}

describe('shared application context', () => {
  it('reads provider state without Apollo and receives user updates', () => {
    const view = render(
      <AppContextProvider user={undefined} userLoading>
        <Consumer />
      </AppContextProvider>,
    )
    expect(screen.getByText('loading')).toBeTruthy()
    view.rerender(
      <AppContextProvider
        user={{ id: 'owner', sudo: false, status: UserStatusEnum.ACTIVE }}
        userLoading={false}
      >
        <Consumer />
      </AppContextProvider>,
    )
    expect(screen.getByText('owner')).toBeTruthy()
  })

  it('loads me once in App and shares the result with all consumers', async () => {
    const operations: string[] = []
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(
        (operation) =>
          new Observable((observer) => {
            operations.push(operation.operationName ?? '')
            queueMicrotask(() => {
              observer.next({
                data: {
                  me: {
                    __typename: 'User',
                    id: 'owner',
                    username: 'owner',
                    fullname: 'Owner',
                    sudo: false,
                    status: 'active',
                  },
                },
              })
              observer.complete()
            })
          }),
      ),
    })
    vi.mocked(useApollo).mockReturnValue(client)
    try {
      render(
        <App>
          <Consumer />
          <Consumer />
        </App>,
      )
      await waitFor(() => expect(screen.getAllByText('owner')).toHaveLength(2))
      expect(operations).toEqual(['me'])
    } finally {
      cleanup()
      client.stop()
    }
  })
})

// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
} from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { MetaMaskAuth } from './index'

const address = '0x1234567890123456789012345678901234567890'
const message = 'Подпишите сообщение для входа на сайт'
afterEach(() => {
  cleanup()
  delete window.ethereum
  localStorage.clear()
})

function setup(registrationError = false) {
  const operations = vi.fn()
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          operations(operation.operationName, operation.variables)
          queueMicrotask(() => {
            if (operation.operationName === 'ethAccountNonce') {
              observer.next({
                data: {
                  ethAccountNonce: {
                    __typename: 'EthAccountNoncePayload',
                    nonce: 'nonce',
                    message,
                  },
                },
              })
            } else if (registrationError) {
              observer.next({
                errors: [
                  { message: 'Для регистрации требуется токен приглашения' },
                ],
              })
            } else {
              observer.next({
                data: {
                  response: {
                    __typename: 'EthAccountAuthPayload',
                    success: true,
                    message: null,
                    token: 'wallet-token',
                  },
                },
              })
            }
            observer.complete()
          })
        }),
    ),
  })
  const reset = vi.spyOn(client, 'resetStore')
  const onSuccess = vi.fn()
  render(
    <ApolloProvider client={client}>
      <MetaMaskAuth onSuccess={onSuccess} referrerToken="invitation" />
    </ApolloProvider>,
  )
  return { operations, reset, onSuccess }
}

function installWallet() {
  const request = vi.fn(
    async ({ method }: { method: string }): Promise<unknown> =>
      method === 'eth_requestAccounts' ? [address] : 'signature',
  )
  window.ethereum = { isMetaMask: true, request }
  return request
}

describe('MetaMask sign in', () => {
  it('shows a useful error when MetaMask is not installed', () => {
    const { operations } = setup()
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('alert').textContent).toContain(
      'Установите MetaMask',
    )
    expect(operations).not.toHaveBeenCalled()
  })

  it('requests a challenge, signs it, forwards the invitation and refreshes the session', async () => {
    const request = installWallet()
    const { operations, reset, onSuccess } = setup()
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
    expect(request).toHaveBeenCalledTimes(2)
    expect(request).toHaveBeenNthCalledWith(2, {
      method: 'personal_sign',
      params: ['0x' + Buffer.from(message).toString('hex'), address],
    })
    expect(operations).toHaveBeenNthCalledWith(1, 'ethAccountNonce', {
      address,
    })
    expect(operations).toHaveBeenNthCalledWith(2, 'authEthAccount', {
      data: {
        address,
        nonce: 'nonce',
        signature: 'signature',
        referrerToken: 'invitation',
      },
    })
    expect(localStorage.getItem('token')).toBe('wallet-token')
    expect(reset).toHaveBeenCalledOnce()
  })

  it('explains restricted registration and does not store a session', async () => {
    installWallet()
    const { onSuccess } = setup(true)
    fireEvent.click(screen.getByRole('button'))
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Для регистрации нужно приглашение',
    )
    expect(localStorage.getItem('token')).toBeNull()
    expect(onSuccess).not.toHaveBeenCalled()
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(
      false,
    )
  })

  it('allows retry after the user rejects the signature', async () => {
    const request = installWallet()
    request.mockImplementation(async ({ method }) => {
      if (method === 'personal_sign') {
        throw { code: 4001 }
      }
      return [address]
    })
    const { operations } = setup()
    fireEvent.click(screen.getByRole('button'))
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Запрос в MetaMask отменён',
    )
    expect(operations).toHaveBeenCalledOnce()
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(
      false,
    )
    expect(localStorage.getItem('token')).toBeNull()
  })
})

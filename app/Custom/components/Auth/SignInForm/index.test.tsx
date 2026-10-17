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
import { SignInForm } from './index'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

function setup(success: boolean, networkError = false) {
  const request = vi.fn()
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          request(operation.variables)
          const timer = setTimeout(() => {
            if (networkError) {
              observer.error(new Error('Network unavailable'))
            } else {
              observer.next({
                data: {
                  response: {
                    __typename: 'AuthPayload',
                    success,
                    token: success ? 'test-token' : null,
                    message: 'Неверный пароль',
                  },
                },
              })
              observer.complete()
            }
          }, 20)
          return () => clearTimeout(timer)
        }),
    ),
  })
  const reset = vi.spyOn(client, 'resetStore')
  const onSuccess = vi.fn()
  render(
    <ApolloProvider client={client}>
      <SignInForm onSuccessHandler={onSuccess} />
    </ApolloProvider>,
  )
  fireEvent.change(screen.getByLabelText('Логин'), {
    target: { value: ' owner ' },
  })
  fireEvent.change(screen.getByLabelText('Пароль'), {
    target: { value: ' secret ' },
  })
  const form = screen.getByRole('button', { name: 'Войти' }).closest('form')
  if (!form) {
    throw new Error('Sign-in form missing')
  }
  fireEvent.submit(form)
  return { request, reset, onSuccess, form }
}

describe('sign in', () => {
  it('stores the token, refreshes Apollo state and prevents duplicate submissions', async () => {
    const { request, reset, onSuccess, form } = setup(true)
    fireEvent.submit(form)
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(
      true,
    )
    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
    expect(request).toHaveBeenCalledExactlyOnceWith({
      where: { username: 'owner' },
      data: { password: ' secret ' },
    })
    expect(localStorage.getItem('token')).toBe('test-token')
    expect(reset).toHaveBeenCalledOnce()
  })

  it('shows invalid credentials without storing a token', async () => {
    const { reset, onSuccess } = setup(false)
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Неверный логин или пароль.',
    )
    expect(localStorage.getItem('token')).toBeNull()
    expect(reset).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(
      false,
    )
  })

  it('allows retry after a network error', async () => {
    const { onSuccess } = setup(false, true)
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Не удалось войти. Попробуйте ещё раз.',
    )
    expect(onSuccess).not.toHaveBeenCalled()
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(
      false,
    )
  })
})

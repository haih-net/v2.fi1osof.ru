// @vitest-environment jsdom
import React from 'react'
import { afterEach, expect, it } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter } from 'react-router'
import { SignUpForm } from './index'

afterEach(cleanup)

it('обновляет общую ошибку при вводе и очистке email и вводе логина без повторной отправки', async () => {
  render(
    <MemoryRouter initialEntries={['/signup?referrerToken=']}>
      <MockedProvider>
        <SignUpForm />
      </MockedProvider>
    </MemoryRouter>,
  )

  const message = 'Укажите логин или электронную почту'
  const email = screen.getByLabelText('Электронная почта')
  const username = screen.getByLabelText('Логин')
  const submit = screen.getByRole('button', { name: 'Зарегистрироваться' })

  fireEvent.click(submit)
  expect(await screen.findByText(message)).toBeTruthy()
  await waitFor(() =>
    expect((submit as HTMLButtonElement).disabled).toBe(false),
  )

  email.focus()
  fireEvent.change(email, { target: { value: 'test@example.com' } })
  await waitFor(() => expect(screen.queryByText(message)).toBeNull())
  expect(document.activeElement).toBe(email)

  fireEvent.change(email, { target: { value: '' } })
  expect(await screen.findByText(message)).toBeTruthy()
  expect(document.activeElement).toBe(email)

  username.focus()
  fireEvent.change(username, { target: { value: 'testuser' } })
  await waitFor(() => expect(screen.queryByText(message)).toBeNull())
  expect(document.activeElement).toBe(username)
})

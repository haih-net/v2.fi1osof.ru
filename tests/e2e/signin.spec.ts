import { test, expect } from '@playwright/test'

const signMessage = 'Test sign-in challenge: test-nonce'

test('MetaMask sign-in refreshes the session and redirects to profile', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(
    (expectedMessage) => {
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method, params }) => {
          if (method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890']
          }
          if (method === 'personal_sign' && params?.[0] === expectedMessage) {
            return 'test-signature'
          }
          throw new Error('Unexpected wallet request')
        },
      }
    },
    '0x' + Buffer.from(signMessage, 'utf8').toString('hex'),
  )
  let authenticated = false
  await page.route(/\/api\/?$/, async (route) => {
    const request = route.request()
    const body = request.postDataJSON() as {
      operationName: string
      variables: Record<string, unknown>
    }
    if (body.operationName === 'ethAccountNonce') {
      await route.fulfill({
        json: {
          data: {
            ethAccountNonce: { nonce: 'test-nonce', message: signMessage },
          },
        },
      })
    } else if (body.operationName === 'authEthAccount') {
      expect(body.variables).toEqual({
        data: {
          address: '0x1234567890123456789012345678901234567890',
          signature: 'test-signature',
          nonce: 'test-nonce',
          referrerToken: 'invitation',
        },
      })
      authenticated = true
      await route.fulfill({
        json: {
          data: {
            response: {
              success: true,
              message: null,
              token: 'test-auth-token',
            },
          },
        },
      })
    } else if (body.operationName === 'me') {
      if (authenticated) {
        expect(request.headers().authorization).toBe('Bearer test-auth-token')
      }
      await route.fulfill({
        json: {
          data: {
            me: authenticated
              ? {
                  __typename: 'User',
                  id: 'wallet-user',
                  username: null,
                  fullname: null,
                  sudo: false,
                  status: 'active',
                }
              : null,
          },
        },
      })
    } else {
      await route.continue()
    }
  })
  const response = await page.goto('/signin?referrerToken=invitation')
  expect(response?.status()).toBe(200)
  await expect(
    page.getByRole('button', { name: 'Войти через MetaMask' }),
  ).toBeEnabled()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false)
  await page.getByRole('button', { name: 'Войти через MetaMask' }).click()
  await expect(page).toHaveURL(/\/panel\/profile$/)
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBe(
    'test-auth-token',
  )
  expect(errors).toEqual([])
})

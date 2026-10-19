import { MockedProvider } from '@apollo/client/testing/react'
import type { Decorator } from '@storybook/react-vite'

export const withApollo: Decorator = (Story) => (
  <MockedProvider>
    <Story />
  </MockedProvider>
)

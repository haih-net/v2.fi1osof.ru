import type { Meta, StoryObj } from '@storybook/react-vite'
import { MockedProvider } from '@apollo/client/testing/react'
import { SigninDocument } from 'app/gql/generated'
import { SignInForm } from './index'

const meta = {
  title: 'Components/Auth/Sign in',
  component: SignInForm,
  decorators: [
    (Story) => (
      <MockedProvider
        mocks={[
          {
            request: {
              query: SigninDocument,
              variables: {
                where: { username: 'demo' },
                data: { password: 'incorrect' },
              },
            },
            result: {
              data: {
                response: {
                  __typename: 'AuthPayload',
                  success: false,
                  message: 'Invalid password',
                  token: null,
                },
              },
            },
          },
        ]}
      >
        <Story />
      </MockedProvider>
    ),
  ],
} satisfies Meta<typeof SignInForm>

export default meta

type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Loading: Story = { args: { loading: true } }

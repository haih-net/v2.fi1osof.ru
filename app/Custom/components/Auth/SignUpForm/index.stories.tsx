import type { Meta, StoryObj } from '@storybook/react-vite'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter } from 'react-router'
import { SignupDocument } from 'app/gql/generated'
import { SignUpForm } from './index'

const meta = {
  title: 'Компоненты/Авторизация/Форма регистрации',
  component: SignUpForm,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <MockedProvider
          mocks={[
            {
              request: { query: SignupDocument, variables: () => true },
              result: { errors: [{ message: 'Еще не реализовано' }] },
            },
          ]}
        >
          <Story />
        </MockedProvider>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof SignUpForm>

export default meta

type Story = StoryObj<typeof meta>
export const Default: Story = {}
export const Loading: Story = { args: { loading: true } }

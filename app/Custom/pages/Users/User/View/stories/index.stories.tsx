import type { Meta, StoryObj } from '@storybook/react-vite'
import type { MockLink } from '@apollo/client/testing'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter } from 'react-router'
import { AppContextProvider } from 'app/Custom/components/AppContext'
import { SnackbarProvider } from 'app/Custom/components/Snackbar'
import {
  UserStatusEnum,
  type MeUserFragment,
  MyTransactionsWithCountDocument,
  UpdateCurrentUserDocument,
  CreateReferrerTokenDocument,
  type UpdateCurrentUserMutationVariables,
} from 'app/gql/generated'
import { UserPageView } from '../'

const mockCurrentUser: MeUserFragment = {
  __typename: 'User',
  id: 'demo',
  username: 'demo',
  fullname: 'Demo User',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  status: UserStatusEnum.ACTIVE,
  sudo: false,
  isAiAgent: false,
  image: null,
  content: 'Profile description',
  intro: '',
  Balance: null,
  EthAccount: null,
  TelegramAccount: null,
}
const mockViewedUser: MeUserFragment = {
  ...mockCurrentUser,
  id: 'other',
  fullname: 'Other User',
}
const mocks: MockLink.MockedResponse[] = [
  {
    request: {
      query: MyTransactionsWithCountDocument,
      variables: { skip: 0, take: 10 },
    },
    result: { data: { myTransactions: [], myTransactionsCount: 0 } },
  },
  {
    request: { query: CreateReferrerTokenDocument },
    result: { data: { createReferrerToken: 'demo-invitation' } },
  },
  {
    request: { query: UpdateCurrentUserDocument, variables: () => true },
    result: ({ data }: UpdateCurrentUserMutationVariables) => ({
      data: {
        response: {
          ...mockCurrentUser,
          ...data,
          isAiAgent: data.isAiAgent ?? false,
        },
      },
    }),
  },
]
const meta = {
  title: 'pages/Users/User/View',
  component: UserPageView,
  decorators: [
    (Story, context) => (
      <MemoryRouter>
        <MockedProvider mocks={mocks}>
          <SnackbarProvider>
            <AppContextProvider
              user={context.parameters.currentUser ?? null}
              userLoading={false}
            >
              <Story />
            </AppContextProvider>
          </SnackbarProvider>
        </MockedProvider>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof UserPageView>
export default meta
type Story = StoryObj<typeof meta>
export const NotAuthenticated: Story = { args: { user: mockViewedUser } }
export const AuthenticatedOtherUser: Story = {
  args: { user: mockViewedUser },
  parameters: { currentUser: mockCurrentUser },
}
export const AuthenticatedOwnProfile: Story = {
  args: { user: mockCurrentUser },
  parameters: { currentUser: mockCurrentUser },
}

import type { Preview } from '@storybook/react-vite'
import { withApollo } from './decorators/withApollo'
import { withChatContext } from './decorators/withChatContext'

const preview: Preview = {
  decorators: [withApollo, withChatContext],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview

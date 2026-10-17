import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChatMessage as Component } from './'

const meta = {
  title: 'Components/ChatWidget/ChatMessage',
  component: Component,
  args: {
    id: 'foo',
    isUser: false,
    text: 'Some text',
  },
} satisfies Meta<typeof Component>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}

export const UserMessage: Story = {
  args: {
    isUser: true,
  },
}

export const LongMessage: Story = {
  args: {
    text: `Contrary to popular belief, Lorem Ipsum is not simply random text.
It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. 
Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, 
looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, 
and going through the cites of the word in classical literature, discovered the undoubtable source.`,
  },
}

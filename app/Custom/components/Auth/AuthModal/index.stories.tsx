import { useCallback, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { AuthModal as Component } from './index'

type Props = Parameters<typeof Component>[0]

function Renderer({ isOpen: isOpenInitial = true }: Props) {
  const [isOpen, setIsOpen] = useState(isOpenInitial)

  const handleOpen = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <>
      <button onClick={handleOpen}>Открыть окно входа</button>
      <Component isOpen={isOpen} onClose={handleClose} />
    </>
  )
}

const meta = {
  title: 'Компоненты/Авторизация/Окно входа',
  component: Renderer,
} satisfies Meta<typeof Renderer>

export default meta

type Story = StoryObj<typeof Renderer>

export const Default: Story = {
  args: {
    isOpen: true,
  },
}

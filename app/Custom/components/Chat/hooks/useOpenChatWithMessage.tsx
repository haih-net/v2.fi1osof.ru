import { useCallback } from 'react'
import { useChatContext } from '../ChatWidget/context'

export function useOpenChatWithMessage() {
  const { initialMessageSetter, setIsOpen } = useChatContext()

  const eventHandler = useCallback(
    (
      event:
        | React.MouseEvent<HTMLButtonElement>
        | React.SubmitEvent<HTMLFormElement>,
    ) => {
      event.preventDefault()
      event.stopPropagation()

      let message: string

      if (event.currentTarget instanceof HTMLFormElement) {
        const form = event.currentTarget
        const formData = new FormData(form)
        const submitButton = form.querySelector(
          'button[type="submit"]',
        ) as HTMLButtonElement
        const buttonText =
          submitButton?.value || submitButton?.textContent || ''

        const fields: string[] = []

        if (buttonText) {
          fields.push(buttonText)
        }

        formData.forEach((value, key) => {
          if (value && typeof value === 'string' && value.trim()) {
            const input = form.querySelector(`[name="${key}"]`) as
              HTMLInputElement | HTMLTextAreaElement
            const label = input?.name || key

            if (label) {
              fields.push(`${label}: ${value.trim()}`)
            }
          }
        })

        message = fields.join('\n')

        form.reset()
      } else {
        message = event.currentTarget.value
      }

      initialMessageSetter(message)
      setIsOpen(true)
    },
    [initialMessageSetter, setIsOpen],
  )

  return eventHandler
}

import React, { useCallback, useEffect, useReducer, useRef } from 'react'
import {
  useCreateFeedbackTokenMutation,
  useSubmitFeedbackMutation,
} from 'app/gql/generated'
import { useAppContext } from '../../hooks/useAppContext'
import { FeedbackDialog } from './styles'

interface FeedbackState {
  token: string
  openedAt: number
  contacts: string
  message: string
  error: string
  receipt: string
  pending: boolean
}

const initialState: FeedbackState = {
  token: '',
  openedAt: 0,
  contacts: '',
  message: '',
  error: '',
  receipt: '',
  pending: false,
}

const feedbackReducer = (
  state: FeedbackState,
  update: Partial<FeedbackState>,
): FeedbackState => ({ ...state, ...update })

export const FeedbackForm: React.FC = () => {
  const { isFeedbackOpen: open, closeFeedback } = useAppContext()
  const [createFeedbackToken] = useCreateFeedbackTokenMutation()
  const [submitFeedback] = useSubmitFeedbackMutation()
  const [
    { token, openedAt, contacts, message, error, receipt, pending },
    dispatch,
  ] = useReducer(feedbackReducer, initialState)
  const dialog = useRef<HTMLDialogElement>(null)
  const submitting = useRef(false)
  const close = useCallback((): void => {
    if (!submitting.current) {
      closeFeedback()
    }
  }, [closeFeedback])
  useEffect(() => {
    if (!open) {
      dialog.current?.close()
      return
    }
    dialog.current?.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dispatch({ openedAt: Date.now(), error: '', receipt: '', token: '' })
    return () => {
      document.body.style.overflow = overflow
    }
  }, [open])
  const submit = useCallback(
    async (event: React.SubmitEvent): Promise<void> => {
      event.preventDefault()
      if (submitting.current) {
        return
      }
      const remaining = Math.ceil((5000 - (Date.now() - openedAt)) / 1000)
      if (!openedAt || remaining > 0) {
        window.alert(
          `Попробуйте отправить через ${Math.max(1, remaining)} сек.`,
        )
        return
      }
      submitting.current = true
      dispatch({ pending: true, error: '' })
      try {
        let messageToken = token
        if (!messageToken) {
          const { data } = await createFeedbackToken()
          if (!data?.createChatToken) {
            throw new Error('Не удалось получить токен. Попробуйте ещё раз.')
          }
          messageToken = data.createChatToken
          dispatch({ token: messageToken })
        }
        const { data } = await submitFeedback({
          variables: { data: { token: messageToken, contacts, message } },
        })
        if (!data?.submitFeedback) {
          throw new Error('Не удалось отправить сообщение. Попробуйте ещё раз.')
        }
        dispatch({ receipt: data.submitFeedback, contacts: '', message: '' })
      } catch (error) {
        dispatch({
          error:
            error instanceof Error
              ? error.message
              : 'Не удалось отправить сообщение.',
        })
      } finally {
        submitting.current = false
        dispatch({ pending: false })
      }
    },
    [token, contacts, message, openedAt, createFeedbackToken, submitFeedback],
  )
  const onCancel = useCallback(
    (event: React.SyntheticEvent): void => {
      event.preventDefault()
      close()
    },
    [close],
  )
  const onBackdrop = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>): void => {
      if (event.target !== dialog.current || !dialog.current) {
        return
      }
      const rect = dialog.current.getBoundingClientRect()
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        close()
      }
    },
    [close],
  )
  const onContacts = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void =>
      dispatch({ contacts: event.target.value }),
    [],
  )
  const onMessage = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>): void =>
      dispatch({ message: event.target.value }),
    [],
  )
  return (
    <FeedbackDialog
      ref={dialog}
      aria-labelledby="feedback-title"
      onCancel={onCancel}
      onClick={onBackdrop}
    >
      <button
        className="close"
        type="button"
        aria-label="Закрыть форму"
        onClick={close}
        disabled={pending}
      >
        ×
      </button>
      <h2 id="feedback-title">Написать мне</h2>
      {receipt ? (
        <p role="status">{receipt}</p>
      ) : (
        <form onSubmit={submit} aria-busy={pending}>
          <label>
            Контакты
            <input
              autoFocus
              required
              maxLength={1000}
              value={contacts}
              onChange={onContacts}
              placeholder="Telegram, телефон, email или другой способ связи"
              disabled={pending}
            />
          </label>
          <label>
            Сообщение
            <textarea
              required
              maxLength={10000}
              value={message}
              onChange={onMessage}
              disabled={pending}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button className="submit" type="submit" disabled={pending}>
            {pending ? 'Отправляю…' : 'Отправить'}
          </button>
        </form>
      )}
    </FeedbackDialog>
  )
}

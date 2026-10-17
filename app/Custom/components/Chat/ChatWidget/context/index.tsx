import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react'
import { ChatMessage, CHAT_SESSION_STORAGE_KEY } from '../interfaces'
import { useSnackbar } from 'app/Custom/hooks/useSnackbar'
import { sendMessageStream } from '../../lib/streamClient'
import { recordStatistics } from 'app/components/Statistics'
import { useLocation } from 'react-router'

export type ChatContextValue = {
  messages: ChatMessage[]
  isLoading: boolean
  showTypingIndicator: boolean
  isOpen: boolean
  isExpanded: boolean
  setIsOpen: (open: boolean) => void
  setIsExpanded: (expanded: boolean) => void
  submitMessage: (text: string) => Promise<void>
  stopStreaming: () => void
  handleClose: () => void
  handleExpand: () => void
  handleToggle: (event: React.MouseEvent) => void
  welcomeTitle: string
  welcomeText: string
  placeholder: string
  initialMessage: string
  initialMessageSetter: React.Dispatch<React.SetStateAction<string>>
}

export const ChatContext = createContext<ChatContextValue | null>(null)

export const useChatContext = () => {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext должен использоваться внутри ChatProvider')
  }
  return context
}

type ChatProviderProps = {
  children: React.ReactNode
  welcomeTitle?: string
  welcomeText?: string
  placeholder?: string
}

export const ChatProvider: React.FC<ChatProviderProps> = ({
  children,
  welcomeTitle = 'Здравствуйте! Чем я могу помочь?',
  welcomeText = 'Задайте мне любой вопрос',
  placeholder = 'Напишите сообщение...',
}) => {
  const snackbar = useSnackbar()
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showTypingIndicator, setShowTypingIndicator] = useState(false)
  const [initialMessage, initialMessageSetter] = useState('')

  const sessionIdRef = useRef<string | null>(null)

  const getSessionId = useCallback(() => {
    if (sessionIdRef.current) {
      return sessionIdRef.current
    }
    let stored: string | null = null
    try {
      stored = localStorage.getItem(CHAT_SESSION_STORAGE_KEY)
    } catch {
      /* Недоступное хранилище не мешает диалогу. */
    }
    if (stored) {
      sessionIdRef.current = stored
      return stored
    }
    const newId = `chat_${Date.now()}_${Math.random().toString(36).slice(2)}`
    try {
      localStorage.setItem(CHAT_SESSION_STORAGE_KEY, newId)
    } catch {
      /* Идентификатор остаётся в памяти. */
    }
    sessionIdRef.current = newId
    return newId
  }, [])
  const streamingMessageIdRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const TYPING_INDICATOR_DELAY = 400

  const startTypingTimer = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
    }
    typingTimerRef.current = setTimeout(() => {
      setShowTypingIndicator(true)
    }, TYPING_INDICATOR_DELAY)
  }, [])

  const resetTypingTimer = useCallback(() => {
    setShowTypingIndicator(false)
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
    }
    typingTimerRef.current = setTimeout(() => {
      setShowTypingIndicator(true)
    }, TYPING_INDICATOR_DELAY)
  }, [])

  const clearTypingTimer = useCallback(() => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = null
    }
    setShowTypingIndicator(false)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setIsExpanded(false)
  }, [])

  const handleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const handleToggle = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    setIsOpen((prev) => !prev)
  }, [])

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      streamingMessageIdRef.current = null
      setIsLoading(false)
      clearTypingTimer()
    }
  }, [clearTypingTimer])

  const submitMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || abortControllerRef.current) {
        return
      }

      const messageText = text.trim()
      const messageId = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const statisticsData = {
        messageId,
        message: messageText,
        messageLength: messageText.length,
      }
      let sessionId: string | undefined
      let responseText = ''
      let responseLength = 0
      let finished = false
      const handleError = (error: Error) => {
        if (
          finished ||
          (controller.signal.aborted &&
            abortControllerRef.current !== controller)
        ) {
          return
        }
        finished = true
        if (error.name !== 'AbortError') {
          recordStatistics('chat.message.error', {
            ...statisticsData,
            status: 'failed',
            sessionId,
            error: { name: error.name, message: error.message },
          })
          snackbar?.addMessage(error.message, { variant: 'error' })
          const failedMessageId = streamingMessageIdRef.current
          const errorMessage: ChatMessage = {
            id: failedMessageId || `${messageId}_error`,
            text: 'Что-то пошло не так. Попробуйте ещё раз.',
            isUser: false,
            failed: true,
          }
          setMessages((prev) =>
            failedMessageId
              ? prev.map((msg) =>
                  msg.id === failedMessageId ? errorMessage : msg,
                )
              : [...prev, errorMessage],
          )
        }
        streamingMessageIdRef.current = null
        abortControllerRef.current = null
        setIsLoading(false)
        clearTypingTimer()
      }

      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          text: messageText,
          isUser: true,
        },
      ])
      setIsLoading(true)
      const controller = new AbortController()
      abortControllerRef.current = controller
      startTypingTimer()
      setIsExpanded(true)

      try {
        sessionId = getSessionId()
        Object.assign(statisticsData, { sessionId })
        recordStatistics('chat.message.sent', statisticsData)
        await sendMessageStream(
          messageText,
          sessionId,
          {
            onChunk: (chunk) => {
              if (finished || controller.signal.aborted) {
                return
              }
              responseLength += chunk.length
              responseText += chunk
              resetTypingTimer()
              if (!streamingMessageIdRef.current) {
                const botMessageId = Date.now().toString()
                streamingMessageIdRef.current = botMessageId
                setMessages((prev) => [
                  ...prev,
                  {
                    id: botMessageId,
                    text: chunk,
                    isUser: false,
                  },
                ])
              } else {
                const botMessageId = streamingMessageIdRef.current
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === botMessageId
                      ? { ...msg, text: msg.text + chunk }
                      : msg,
                  ),
                )
              }
            },
            onDone: () => {
              if (finished || controller.signal.aborted) {
                return
              }
              finished = true
              if (responseLength > 0) {
                recordStatistics('chat.message.received', {
                  ...statisticsData,
                  sessionId,
                  response: responseText,
                  responseLength,
                })
              }
              streamingMessageIdRef.current = null
              abortControllerRef.current = null
              setIsLoading(false)
              clearTypingTimer()
            },
            onError: handleError,
          },
          controller.signal,
        )
      } catch (error) {
        handleError(error instanceof Error ? error : new Error(String(error)))
      }
    },
    [
      snackbar,
      getSessionId,
      startTypingTimer,
      resetTypingTimer,
      clearTypingTimer,
    ],
  )

  const location = useLocation()

  useEffect(() => {
    setIsOpen(false)
  }, [location.pathname])
  useEffect(
    () => () => {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
      }
    },
    [],
  )

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      isLoading,
      showTypingIndicator,
      isOpen,
      isExpanded,
      setIsOpen,
      setIsExpanded,
      submitMessage,
      stopStreaming,
      handleClose,
      handleExpand,
      handleToggle,
      welcomeTitle,
      welcomeText,
      placeholder,
      initialMessage,
      initialMessageSetter,
    }),
    [
      messages,
      isLoading,
      showTypingIndicator,
      isOpen,
      isExpanded,
      submitMessage,
      stopStreaming,
      handleClose,
      handleExpand,
      handleToggle,
      welcomeTitle,
      welcomeText,
      placeholder,
      initialMessage,
      initialMessageSetter,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

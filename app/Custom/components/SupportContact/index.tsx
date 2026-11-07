import { useAppContext } from 'app/Custom/hooks/useAppContext'
import { useCallback } from 'react'

export const SupportContact: React.FC = () => {
  const { openFeedback } = useAppContext() ?? {}
  const handleContact = useCallback(() => openFeedback?.(), [openFeedback])
  return (
    <div className="card">
      <h2>Обсудим ваш сайт</h2>
      <p>
        Моя услуга — постоянная поддержка и развитие сайта от 30 000 ₽ в месяц.
        Выбираю проекты, которым подходят мои инструменты и самостоятельный
        формат работы. Начнём с адреса сайта и ваших задач.
      </p>
      <button
        className="contact-button"
        type="button"
        onClick={handleContact}
        disabled={!openFeedback}
      >
        Написать мне
      </button>
    </div>
  )
}

import type React from 'react'
import { useChatDialoguesQuery } from 'app/gql/generated'
import { DialogueCard } from './DialogueCard'

export const DialogueList: React.FC = () => {
  const { data, loading, error } = useChatDialoguesQuery({
    fetchPolicy: 'network-only',
  })
  if (loading) {
    return <p role="status">Загрузка диалогов…</p>
  }
  if (error) {
    return <p role="alert">Не удалось загрузить диалоги</p>
  }
  const dialogues = data?.chatDialogues ?? []
  return (
    <>
      <p>Всего диалогов: {dialogues.length}</p>
      {dialogues.length === 0 && <p>Диалогов пока нет</p>}
      <div className="dialogue-grid">
        {dialogues.map((dialogue) => (
          <DialogueCard key={dialogue.chatId} dialogue={dialogue} />
        ))}
      </div>
    </>
  )
}

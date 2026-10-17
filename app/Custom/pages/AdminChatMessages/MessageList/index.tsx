import React, { useCallback, useMemo, useState } from 'react'
import { Button } from 'app/Custom/components/Button'
import { MessageRow } from './MessageRow'
import { useChatMessageIndexesQuery } from 'app/gql/generated'

const pageSize = 10

export const MessageList: React.FC = () => {
  const { data, loading, error, refetch } = useChatMessageIndexesQuery({
    fetchPolicy: 'network-only',
  })
  const [page, setPage] = useState(0)
  const entries = useMemo(
    () => [...(data?.chatMessageIndexes ?? [])].reverse(),
    [data],
  )
  const usage = useMemo(() => {
    const totals = {
      inputTokens: 0,
      cachedTokens: 0,
      outputTokens: 0,
      recorded: 0,
    }
    for (const entry of entries) {
      if (entry.usage) {
        totals.recorded += 1
        totals.inputTokens += entry.usage.inputTokens ?? 0
        totals.cachedTokens += entry.usage.cachedTokens ?? 0
        totals.outputTokens += entry.usage.outputTokens ?? 0
      }
    }
    return totals
  }, [entries])
  const pages = Math.max(1, Math.ceil(entries.length / pageSize))
  const current = Math.min(page, pages - 1)
  const previous = useCallback(
    () => setPage(Math.max(0, current - 1)),
    [current],
  )
  const next = useCallback(
    () => setPage(Math.min(pages - 1, current + 1)),
    [current, pages],
  )
  const refresh = useCallback(() => {
    void refetch().catch(() => undefined)
  }, [refetch])
  return (
    <>
      <Button onClick={refresh} disabled={loading}>
        Обновить
      </Button>
      {loading && <p role="status">Загрузка журнала…</p>}
      {error && <p role="alert">Не удалось загрузить журнал сообщений</p>}
      {!loading && !error && entries.length === 0 && (
        <p>В журнале пока нет сообщений</p>
      )}
      {entries.length > 0 && (
        <>
          <p>Всего сообщений: {entries.length}</p>
          <div className="usage-summary">
            <strong>Использование токенов за весь журнал</strong>
            <span>Входные: {usage.inputTokens.toLocaleString('ru-RU')}</span>
            <span>
              Из них кешированные: {usage.cachedTokens.toLocaleString('ru-RU')}
            </span>
            <span>Выходные: {usage.outputTokens.toLocaleString('ru-RU')}</span>
            <span>
              Сообщений со статистикой: {usage.recorded} из {entries.length}
            </span>
            <small>
              Суммы по записанным данным. Пропущенные значения не учитываются.
            </small>
          </div>
          <nav aria-label="Страницы сообщений">
            <Button onClick={previous} disabled={current === 0}>
              Назад
            </Button>
            <span>
              Страница {current + 1} из {pages}
            </span>
            <Button onClick={next} disabled={current + 1 >= pages}>
              Далее
            </Button>
          </nav>
          <div className="message-grid">
            {entries
              .slice(current * pageSize, (current + 1) * pageSize)
              .map((entry) => (
                <MessageRow key={`${entry.chatId}:${entry.id}`} entry={entry} />
              ))}
          </div>
        </>
      )}
    </>
  )
}

import type * as React from 'react'
export const FormattedDate: React.FC<{
  value: string
  format?: 'dateTimeMedium'
}> = ({ value, format }) => {
  const date = new Date(value)
  return (
    <time dateTime={date.toISOString()}>
      {new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        ...(format ? { timeStyle: 'short' as const } : {}),
        timeZone: 'Europe/Moscow',
      }).format(date)}
    </time>
  )
}

import {
  Bot,
  CircleHelp,
  FileOutput,
  Settings,
  User,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

type ChatMessageRoleProps = {
  role: string
}

export const ChatMessageRole: React.FC<ChatMessageRoleProps> = ({ role }) => {
  let title: string
  let Icon: LucideIcon

  switch (role) {
    case 'user':
      title = 'Пользователь'
      Icon = User
      break
    case 'assistant':
      title = 'Помощник'
      Icon = Bot
      break
    case 'system':
      title = 'Система'
      Icon = Settings
      break
    case 'tool_call':
      title = 'Вызов инструмента'
      Icon = Wrench
      break
    case 'tool':
      title = 'Результат инструмента'
      Icon = FileOutput
      break
    default:
      title = role ? `Неизвестная роль: ${role}` : 'Неизвестная роль'
      Icon = CircleHelp
  }

  return (
    <span title={title} role="img" aria-label={title}>
      <Icon size={24} aria-hidden="true" />
    </span>
  )
}

import type * as React from 'react'
import { ChatContent } from '../../components/Chat/ChatWidget/ChatContent'
import { AiPageStyled } from './styles'

export const AiPage: React.FC = () => (
  <AiPageStyled>
    <h1 tabIndex={-1}>ИИ-помощник</h1>
    <ChatContent />
  </AiPageStyled>
)

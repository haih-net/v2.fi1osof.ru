import type { MetaFunction } from 'react-router'
import { createSeoMeta } from '../components/seo/SeoHeaders'
import { AiPage } from 'app/Custom/pages/Ai'

export const meta: MetaFunction = () =>
  createSeoMeta({
    title: 'ИИ-помощник Николая Ланца',
    description:
      'Пообщайтесь с ИИ-помощником Николая Ланца: узнайте о проектах и опыте разработчика, задайте вопрос или обсудите свою задачу.',
    path: '/ai',
  })
export default AiPage

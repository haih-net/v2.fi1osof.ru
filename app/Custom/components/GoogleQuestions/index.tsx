import React, { useId } from 'react'
import { GoogleQuestionForm } from './GoogleQuestionForm'
import googleAiMode from './GoogleQuestionForm/assets/google-ai-mode.svg'
import { GoogleQuestionsStyled } from './styles'

const searchUrl = (question: string): string =>
  'https://www.google.com/search?' +
  new URLSearchParams({ udm: '50', q: question })

const questions: readonly string[] = [
  'Кто такой Николай Ланец (Fi1osof)?',
  'Какой опыт у Николая Ланца (Fi1osof) и где он работал?',
  'Что известно о Николае Ланце (Fi1osof) за пределами fi1osof.ru?',
]

export const GoogleQuestions: React.FC<{ title: string }> = ({ title }) => {
  const titleId = useId()
  return (
    <GoogleQuestionsStyled aria-labelledby={titleId}>
      <p className="google-mode">
        <img src={googleAiMode} width={24} height={24} alt="" />
        Google · Режим ИИ
      </p>
      <h2 id={titleId}>{title}</h2>
      <ul>
        {questions.map((question) => (
          <li key={question}>
            <a
              href={searchUrl(question)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {question} <span aria-hidden="true">↗</span>
            </a>
          </li>
        ))}
      </ul>
      <GoogleQuestionForm />
    </GoogleQuestionsStyled>
  )
}

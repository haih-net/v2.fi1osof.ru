import React, { useCallback, useId } from 'react'
import {
  Controller,
  FormProvider,
  useForm,
  type ControllerProps,
} from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import googleAiMode from './assets/google-ai-mode.svg'
import { GoogleQuestionFormStyled } from './styles'

interface FormData {
  question: string
}

const schema: yup.ObjectSchema<FormData> = yup.object({
  question: yup.string().trim().required('Введите ваш вопрос'),
})

export const GoogleQuestionForm: React.FC = () => {
  const id = useId()
  const questionId = `${id}-question`
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const form = useForm<FormData>({
    defaultValues: { question: '' },
    resolver: yupResolver(schema, undefined, { mode: 'sync' }),
  })
  const onSubmit = ({ question }: FormData): void => {
    const params = new URLSearchParams({
      udm: '50',
      q: `Николай Ланец (Fi1osof). ${question}`,
    })
    window.open(
      `https://www.google.com/search?${params}`,
      '_blank',
      'noopener,noreferrer',
    )
  }
  const renderQuestion = useCallback<ControllerProps<FormData>['render']>(
    ({ field, fieldState: { error } }) => (
      <input
        {...field}
        id={questionId}
        type="text"
        placeholder="Что вы хотите узнать обо мне?"
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${errorId} ${hintId}` : hintId}
      />
    ),
    [questionId, errorId, hintId],
  )

  return (
    <GoogleQuestionFormStyled onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FormProvider {...form}>
        <label htmlFor={questionId}>Или задайте свой вопрос</label>
        <div className="google-search-box">
          <Controller
            name="question"
            control={form.control}
            render={renderQuestion}
          />
          <button type="submit">
            <img src={googleAiMode} width={24} height={24} alt="" />
            <span>Спросить у Google</span>
            <span aria-hidden="true">↗</span>
          </button>
        </div>
        {form.formState.errors.question && (
          <p id={errorId} className="google-error" role="alert">
            {form.formState.errors.question.message}
          </p>
        )}
        <p id={hintId} className="google-hint">
          Ответ откроется в режиме ИИ Google в новой вкладке.
        </p>
      </FormProvider>
    </GoogleQuestionFormStyled>
  )
}

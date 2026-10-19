import React, {
  lazy,
  Suspense,
  useCallback,
  useId,
  useRef,
  useState,
} from 'react'
import { UserFragment, useUpdateCurrentUserMutation } from 'app/gql/generated'
import { useSnackbar } from 'app/Custom/hooks/useSnackbar'
import { Button } from 'app/Custom/components/Button'
import {
  FileUploader,
  type FileUploaderProps,
} from 'app/Custom/components/FileUploader'
import { UserEditFormStyled } from './styles'
import { validateUserForm, type UserFormData } from './interfaces'

const MarkdownEditor = lazy(async () => ({
  default: (await import('app/Custom/components/Markdown/Editor'))
    .MarkdownEditor,
}))
export const UserEditForm: React.FC<{
  user: UserFragment
  closeForm?: () => void
}> = ({ user, closeForm }) => {
  const id = useId()
  const { addMessage } = useSnackbar() ?? {}
  const [image, setImage] = useState(user.image ?? '')
  const [intro, setIntro] = useState(user.intro ?? '')
  const [content, setContent] = useState(user.content ?? '')
  const [error, setError] = useState<string | null>(null)
  const [update, { loading }] = useUpdateCurrentUserMutation()
  const pending = useRef(false)
  const onChangeImage = useCallback<NonNullable<FileUploaderProps['onChange']>>(
    (file) => setImage(file?.path ?? ''),
    [],
  )
  const onSubmit = useCallback(
    async (event: React.SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault()
      if (pending.current) {
        return
      }
      const fields = new FormData(event.currentTarget)
      const data: UserFormData = {
        username: String(fields.get('username') ?? '').trim() || null,
        fullname: String(fields.get('fullname') ?? ''),
        password: String(fields.get('password') ?? '') || undefined,
        image,
        intro,
        content,
      }
      const form = { formState: { errors: validateUserForm(data) } }
      if (Object.keys(form.formState.errors).length) {
        console.error(form.formState.errors)
        setError(Object.values(form.formState.errors).join('. '))
        addMessage?.('Validation error', { variant: 'warning' })
        return
      }
      pending.current = true
      setError(null)
      try {
        const result = await update({ variables: { data } })
        if (!result.data?.response) {
          throw new Error('No data received')
        }
        addMessage?.('Data saved', { variant: 'success' })
        closeForm?.()
      } catch (error) {
        console.error(error)
        setError(error instanceof Error ? error.message : 'Unexpected error')
        addMessage?.('Unexpected error', { variant: 'error' })
      } finally {
        pending.current = false
      }
    },
    [image, intro, content, update, addMessage, closeForm],
  )
  return (
    <UserEditFormStyled onSubmit={onSubmit}>
      <fieldset disabled={loading}>
        <label htmlFor={`${id}-username`}>
          Логин
          <input
            id={`${id}-username`}
            name="username"
            defaultValue={user.username ?? ''}
            autoComplete="username"
          />
        </label>
        <label htmlFor={`${id}-password`}>
          Новый пароль
          <input
            id={`${id}-password`}
            name="password"
            type="password"
            autoComplete="new-password"
          />
        </label>
        <label htmlFor={`${id}-fullname`}>
          Полное имя
          <input
            id={`${id}-fullname`}
            name="fullname"
            defaultValue={user.fullname ?? ''}
          />
        </label>
        <div>
          Фото профиля
          <FileUploader
            value={image ? `/images/resized/middle/${image}` : ''}
            onChange={onChangeImage}
            disabled={loading}
          />
        </div>
        <Suspense fallback={<p role="status">Загрузка редактора…</p>}>
          <div>
            Кратко о себе
            <MarkdownEditor value={intro} onChange={setIntro} />
          </div>
          <div>
            Подробное описание
            <MarkdownEditor value={content} onChange={setContent} />
          </div>
        </Suspense>
        {error && <p role="alert">{error}</p>}
        <div>
          <Button type="submit">Сохранить</Button>{' '}
          <Button type="button" variant="secondary" onClick={closeForm}>
            Отмена
          </Button>
        </div>
      </fieldset>
    </UserEditFormStyled>
  )
}

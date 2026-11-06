import { lazy, Suspense, useCallback } from 'react'
import { useController, FormProvider, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import {
  useCreateUserMutation,
  useUpdateUserMutation,
  UserStatusEnum,
  type CreateUserMutationVariables,
  type UpdateUserMutationVariables,
  type UserFragment,
} from 'app/gql/generated'
import { Button } from 'app/Custom/components/Button'
import {
  FileUploader,
  type FileUploaderProps,
} from 'app/Custom/components/FileUploader'
import { useSnackbar } from 'app/Custom/hooks/useSnackbar'
import { UserEditFormStyled } from '../Form/styles'

const MarkdownEditor = lazy(async () => ({
  default: (await import('app/Custom/components/Markdown/Editor'))
    .MarkdownEditor,
}))
type FormData = UpdateUserMutationVariables['data'] &
  Pick<CreateUserMutationVariables['data'], 'email'>
const schema: yup.ObjectSchema<FormData> = yup.object({
  username: yup.string().trim().nullable(),
  fullname: yup.string().nullable(),
  email: yup.string().trim().email().nullable(),
  password: yup.string().nullable(),
  image: yup.string().nullable(),
  intro: yup.string().nullable(),
  content: yup.string().nullable(),
  status: yup
    .mixed<UserStatusEnum>()
    .oneOf(Object.values(UserStatusEnum))
    .nullable(),
  sudo: yup.boolean().nullable(),
  isAiAgent: yup.boolean().nullable(),
})

export const ManagedUserForm: React.FC<{
  user?: UserFragment
  onCreated?: (id: string) => void
  closeForm: () => void
}> = ({ user, closeForm, onCreated }) => {
  const { addMessage } = useSnackbar() ?? {}
  const [create] = useCreateUserMutation()
  const [update] = useUpdateUserMutation()
  const form = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      username: user?.username ?? '',
      fullname: user?.fullname ?? '',
      email: '',
      password: '',
      image: user?.image,
      intro: user?.intro,
      content: user?.content,
      status: user?.status,
      sudo: user?.sudo ?? false,
      isAiAgent: user?.isAiAgent ?? false,
    },
  })
  const { field: image } = useController({
    control: form.control,
    name: 'image',
  })
  const { field: intro } = useController({
    control: form.control,
    name: 'intro',
  })
  const { field: content } = useController({
    control: form.control,
    name: 'content',
  })
  const { onChange: setImage } = image
  const changeImage = useCallback<NonNullable<FileUploaderProps['onChange']>>(
    (file) => setImage(file?.path ?? null),
    [setImage],
  )
  const { dirtyFields } = form.formState
  const submit = async ({ email, password, ...profile }: FormData) => {
    try {
      const data = {
        ...profile,
        username: profile.username || null,
        password: password || undefined,
      }
      if (user) {
        for (const key of Object.keys(
          data,
        ) as (keyof UpdateUserMutationVariables['data'])[]) {
          if (!dirtyFields[key]) {
            delete data[key]
          }
        }
        const result = await update({
          variables: { where: { id: user.id }, data },
        })
        if (!result.data?.updateUser) {
          throw new Error('Unable to update user')
        }
      } else {
        if (!password) {
          form.setError('password', { message: 'Password is required' })
          return
        }
        const result = await create({
          variables: { data: { ...data, email: email || null, password } },
        })
        if (!result.data?.createUser) {
          throw new Error('Unable to create user')
        }
        onCreated?.(result.data.createUser.id)
      }
      addMessage?.('User saved', { variant: 'success' })
      closeForm()
    } catch (error) {
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Unable to save user',
      })
    }
  }
  return (
    <FormProvider {...form}>
      <UserEditFormStyled onSubmit={form.handleSubmit(submit)}>
        <fieldset disabled={form.formState.isSubmitting}>
          <label>
            Username
            <input {...form.register('username')} />
          </label>
          <label>
            Full name
            <input {...form.register('fullname')} />
          </label>
          {!user && (
            <label>
              Email
              <input type="email" {...form.register('email')} />
            </label>
          )}
          <label>
            {user ? 'New password' : 'Password'}
            <input
              type="password"
              autoComplete="new-password"
              required={!user}
              {...form.register('password')}
            />
          </label>
          <label>
            Status
            <select
              {...form.register('status', {
                setValueAs: (value) => value || undefined,
              })}
            >
              {!user && <option value="">Site default</option>}
              {Object.values(UserStatusEnum).map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input type="checkbox" {...form.register('sudo')} />
            Sudo access
          </label>
          <label>
            <input type="checkbox" {...form.register('isAiAgent')} />
            AI agent
          </label>
          <div>
            Profile image
            <FileUploader
              value={image.value ? `/images/resized/middle/${image.value}` : ''}
              onChange={changeImage}
              disabled={form.formState.isSubmitting}
            />
          </div>
          <Suspense fallback={<p role="status">Loading editor…</p>}>
            <div>
              Short bio
              <MarkdownEditor
                value={intro.value ?? ''}
                onChange={intro.onChange}
              />
            </div>
            <div>
              Full description
              <MarkdownEditor
                value={content.value ?? ''}
                onChange={content.onChange}
              />
            </div>
          </Suspense>
          {Object.entries(form.formState.errors).map(([name, error]) => (
            <p role="alert" key={name}>
              {error.message}
            </p>
          ))}
          <div>
            <Button type="submit">
              {user ? 'Save changes' : 'Create user'}
            </Button>{' '}
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
          </div>
        </fieldset>
      </UserEditFormStyled>
    </FormProvider>
  )
}

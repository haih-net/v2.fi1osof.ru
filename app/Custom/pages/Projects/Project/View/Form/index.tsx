import React, { useCallback } from 'react'
import * as yup from 'yup'
import {
  Controller,
  type ControllerProps,
  FormProvider,
  useForm,
} from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useApolloClient } from '@apollo/client/react'
import { useNavigate, useRevalidator } from 'react-router'
import {
  type CreateProjectMutationVariables,
  type ProjectFragment,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  UserStatusEnum,
} from 'app/gql/generated'
import { useSnackbar } from 'app/Custom/hooks/useSnackbar'
import { useAppContext } from 'app/Custom/hooks/useAppContext'
import { TextField } from 'app/Custom/components/controls/TextField'
import { Checkbox } from 'app/Custom/components/controls/Checkbox'
import { FormControl } from 'app/Custom/components/FormControl'
import { Button } from 'app/Custom/components/Button'
import {
  FileUploader,
  type FileUploaderProps,
} from 'app/Custom/components/FileUploader'
import { getResizedImagePath } from 'app/Custom/helpers/getResizedImagePath'
import { localized, type Locale } from '../../../../Site/data'
import { ProjectEditFormStyled, ProjectEditFormToolbarStyled } from './styles'

const MarkdownEditor = React.lazy(async () => {
  await import('prismjs')
  const module = await import('app/Custom/components/Markdown/Editor')
  return { default: module.MarkdownEditor }
})
type FormData = CreateProjectMutationVariables['data']

interface ProjectEditFormProps {
  project: ProjectFragment | undefined
  cancelHandler: (() => void) | undefined
  locale: Locale
}
function getDefaultValues(project: ProjectEditFormProps['project']): FormData {
  return {
    name: project?.name ?? '',
    description: project?.description ?? '',
    intro: project?.intro ?? '',
    content: project?.content ?? '',
    image: project?.image ?? '',
    commercial: project?.commercial ?? false,
  }
}
export const schema: yup.ObjectSchema<FormData> = yup.object().shape({
  name: yup.string().trim().required(),
  description: yup.string().nullable(),
  intro: yup.string().nullable(),
  content: yup.string().nullable(),
  image: yup.string().nullable(),
  commercial: yup.boolean().required(),
})
export const ProjectEditForm: React.FC<ProjectEditFormProps> = ({
  project,
  cancelHandler,
  locale,
}) => {
  const { user: currentUser } = useAppContext()
  const { addMessage } = useSnackbar() || {}
  const navigate = useNavigate()
  const client = useApolloClient()
  const revalidator = useRevalidator()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const fieldId = React.useId()
  const [createProjectMutation, { loading: loadingCreateProject }] =
    useCreateProjectMutation()
  const [updateProjectMutation, { loading: loadingUpdateProject }] =
    useUpdateProjectMutation()
  const loading = loadingCreateProject || loadingUpdateProject
  const isActive = currentUser?.status === UserStatusEnum.ACTIVE
  const form = useForm<FormData>({
    defaultValues: getDefaultValues(project),
    resolver: yupResolver(schema),
    shouldFocusError: false,
    reValidateMode: 'onChange',
    mode: 'all',
  })
  const onSubmit = useCallback(
    async (event: React.SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault()
      if (!isActive || loading) {
        return
      }
      try {
        if (!(await form.trigger())) {
          console.error('Form errors', form.formState.errors)
          addMessage?.('Please, check form', { variant: 'warning' })
          return
        }
        const data = form.getValues()
        const result = project
          ? await updateProjectMutation({
              variables: { where: { id: project.id }, data },
            })
          : await createProjectMutation({ variables: { data } })
        const savedProject = result.data?.response
        if (!savedProject) {
          addMessage?.('Error', { variant: 'error' })
          return
        }
        await Promise.all([
          client.refetchQueries({ include: 'active' }),
          revalidator.revalidate(),
        ])
        addMessage?.('Success', { variant: 'success' })
        cancelHandler?.()
        await navigate(localized(`/projects/${savedProject.id}`, locale))
      } catch (error) {
        console.error(error)
        addMessage?.(
          error instanceof Error ? error.message : 'Unexpected error',
          { variant: 'error' },
        )
      }
    },
    [
      isActive,
      loading,
      form,
      project,
      updateProjectMutation,
      createProjectMutation,
      client,
      revalidator,
      addMessage,
      cancelHandler,
      navigate,
      locale,
    ],
  )
  const onChangeImage = useCallback<NonNullable<FileUploaderProps['onChange']>>(
    (file) => {
      form.setValue('image', file?.path || '', {
        shouldValidate: true,
        shouldDirty: true,
      })
    },
    [form],
  )
  const fieldRenderer = useCallback<
    ControllerProps<
      FormData,
      'name' | 'description' | 'intro' | 'content' | 'image'
    >['render']
  >(
    ({
      field: { name, value, onChange, onBlur, ref },
      fieldState: { error },
    }) => {
      const id = `${fieldId}-${name}`
      let label: string
      let editor: React.ReactNode
      switch (name) {
        case 'name':
        case 'description':
          label = name === 'name' ? 'Name' : 'Description'
          editor = (
            <TextField
              id={id}
              name={name}
              value={value || ''}
              onChange={onChange}
              onBlur={onBlur}
              ref={ref}
              aria-invalid={!!error}
            />
          )
          break
        case 'intro':
        case 'content':
          label = name === 'intro' ? 'Intro' : 'Content'
          editor = (
            <div id={id} role="group" aria-label={label} onBlur={onBlur}>
              {mounted && (
                <React.Suspense fallback={<p>Loading editor…</p>}>
                  <MarkdownEditor value={value || ''} onChange={onChange} />
                </React.Suspense>
              )}
            </div>
          )
          break
        case 'image':
          label = 'Image'
          editor = (
            <div id={id} role="group" aria-label={label}>
              <FileUploader
                value={
                  value
                    ? getResizedImagePath({ path: value, size: 'middle' })
                    : ''
                }
                onChange={onChangeImage}
                disabled={loading}
              />
            </div>
          )
          break
      }
      return (
        <FormControl
          label={label}
          htmlFor={id}
          helperText={error?.message}
          error={!!error}
        >
          {editor}
        </FormControl>
      )
    },
    [fieldId, mounted, onChangeImage, loading],
  )
  const commercialRenderer = useCallback<
    ControllerProps<FormData, 'commercial'>['render']
  >(
    ({ field: { value, onChange, onBlur, ref }, fieldState: { error } }) => (
      <FormControl
        label="Commercial"
        htmlFor={`${fieldId}-commercial`}
        helperText={error?.message}
        error={!!error}
      >
        <Checkbox
          id={`${fieldId}-commercial`}
          checked={!!value}
          onChange={onChange}
          onBlur={onBlur}
          ref={ref}
          label=""
        />
      </FormControl>
    ),
    [fieldId],
  )
  return (
    <FormProvider {...form}>
      <ProjectEditFormStyled onSubmit={onSubmit} noValidate>
        <Controller name="name" render={fieldRenderer} />
        <Controller name="description" render={fieldRenderer} />
        <Controller name="intro" render={fieldRenderer} />
        <Controller name="content" render={fieldRenderer} />
        <Controller name="image" render={fieldRenderer} />
        <Controller name="commercial" render={commercialRenderer} />
        <ProjectEditFormToolbarStyled>
          {cancelHandler && (
            <Button variant="secondary" type="button" onClick={cancelHandler}>
              Cancel
            </Button>
          )}
          <Button
            variant="success"
            type="submit"
            disabled={!isActive || loading}
          >
            Save
          </Button>
        </ProjectEditFormToolbarStyled>
      </ProjectEditFormStyled>
    </FormProvider>
  )
}

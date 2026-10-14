import { UserStatusEnum } from '../../../gql/generated'
import * as React from 'react'
import { gql } from '@apollo/client'
import { Link, useNavigate } from 'react-router'
import { useAppContext } from '../../hooks/useAppContext'
import { useSiteMutation } from '../../hooks/useSiteMutation'
import { TimerControl } from '../../components/TimerControl'
import type { Entry } from './data'
import { EditorFormStyled } from './styles'

const MarkdownEditor = React.lazy(async () => {
  // Prism нужен языковым модулям редактора до их загрузки.
  await import('prismjs')
  const module = await import('../../components/Markdown/Editor')
  return { default: module.MarkdownEditor }
})
const createTask = gql`
  mutation SiteCreateTask($data: TaskCreateInput!) {
    response: createTask(data: $data) {
      id
    }
  }
`
const updateTask = gql`
  mutation SiteUpdateTask(
    $where: SiteObjectWhereUniqueInput!
    $data: TaskUpdateInput!
  ) {
    response: updateTask(where: $where, data: $data) {
      id
    }
  }
`
const createLog = gql`
  mutation SiteCreateWorkLog($data: TaskWorkLogCreateInput!) {
    response: createTaskWorkLog(data: $data) {
      id
    }
  }
`
const updateLog = gql`
  mutation SiteUpdateWorkLog(
    $where: SiteObjectWhereUniqueInput!
    $data: TaskWorkLogUpdateInput!
  ) {
    response: updateTaskWorkLog(where: $where, data: $data) {
      id
    }
  }
`

const EditorField: React.FC<{
  label: string
  value: string
  onChange: (value: string) => void
}> = ({ label, value, onChange }) => {
  const [mounted, setMounted] = React.useState(false)
  const id = React.useId()
  React.useEffect(() => setMounted(true), [])
  return (
    <div role="group" aria-labelledby={id}>
      <p id={id}>{label}</p>
      {mounted && (
        <React.Suspense fallback={<p>Загрузка редактора…</p>}>
          <MarkdownEditor value={value} onChange={onChange} />
        </React.Suspense>
      )}
    </div>
  )
}

export const TaskForm: React.FC<{
  task?: Entry
  projectId?: string | null
  onCancel?: () => void
}> = ({ task, projectId, onCancel }) => {
  const { user } = useAppContext()
  const navigate = useNavigate()
  const mutation = useSiteMutation()
  const [title, setTitle] = React.useState(task?.title || '')
  const [project, setProject] = React.useState(
    task?.Project?.id || projectId || '',
  )
  const [description, setDescription] = React.useState(task?.description || '')
  const [content, setContent] = React.useState(task?.content || '')
  const submit = React.useCallback(
    async (event: React.SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault()
      if (!title.trim() || mutation.loading) {
        return
      }
      const id = await mutation.run(task ? updateTask : createTask, {
        where: task ? { id: task.id } : undefined,
        data: { title, projectId: project, description, content },
      })
      if (id) {
        onCancel?.()
        await navigate(`/tasks/${id}`)
      }
    },
    [title, mutation, task, project, description, content, onCancel, navigate],
  )
  const changeProject = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setProject(event.target.value),
    [],
  )
  const changeTitle = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setTitle(event.target.value),
    [],
  )
  return (
    <EditorFormStyled onSubmit={submit}>
      <fieldset disabled={mutation.loading}>
        <label>
          Проект
          <input value={project} onChange={changeProject} />
        </label>
        <label>
          Название
          <input required value={title} onChange={changeTitle} />
        </label>
        <EditorField
          label="Описание"
          value={description}
          onChange={setDescription}
        />
        <EditorField label="Контент" value={content} onChange={setContent} />
        {mutation.error && <p role="alert">{mutation.error}</p>}
        <div className="actions">
          {onCancel && (
            <button type="button" onClick={onCancel}>
              Отмена
            </button>
          )}
          <button
            type="submit"
            disabled={user?.status !== UserStatusEnum.ACTIVE || !title.trim()}
          >
            Сохранить
          </button>
        </div>
      </fieldset>
    </EditorFormStyled>
  )
}

export const WorkLogForm: React.FC<{
  taskId: string
  workLog?: Entry
  onCancel: () => void
}> = ({ taskId, workLog, onCancel }) => {
  const { user } = useAppContext()
  const mutation = useSiteMutation()
  const [content, setContent] = React.useState(workLog?.content || '')
  const submit = React.useCallback(
    async (event: React.SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault()
      if (!content.trim() || mutation.loading) {
        return
      }
      const id = await mutation.run(
        workLog ? updateLog : createLog,
        workLog
          ? { where: { id: workLog.id }, data: { content } }
          : { data: { taskId, content } },
      )
      if (id) {
        onCancel()
      }
    },
    [content, mutation, workLog, taskId, onCancel],
  )
  return (
    <EditorFormStyled onSubmit={submit}>
      <fieldset disabled={mutation.loading}>
        <EditorField label="Контент" value={content} onChange={setContent} />
        {mutation.error && <p role="alert">{mutation.error}</p>}
        <div className="actions">
          <button type="button" onClick={onCancel}>
            Отмена
          </button>
          <button
            type="submit"
            disabled={user?.status !== UserStatusEnum.ACTIVE || !content.trim()}
          >
            Сохранить
          </button>
        </div>
      </fieldset>
    </EditorFormStyled>
  )
}

export const TaskActions: React.FC<{ task: Entry; full?: boolean }> = ({
  task,
  full,
}) => {
  const { user } = useAppContext()
  const [editing, setEditing] = React.useState(false)
  const [statusEditing, setStatusEditing] = React.useState(false)
  const mutation = useSiteMutation()
  const stopEditing = React.useCallback(() => setEditing(false), [])
  const startEditing = React.useCallback(() => setEditing(true), [])
  const toggleStatus = React.useCallback(
    () => setStatusEditing((value) => !value),
    [],
  )
  const changeStatus = React.useCallback(
    async (event: React.ChangeEvent<HTMLSelectElement>) => {
      if (
        await mutation.run(updateTask, {
          where: { id: task.id },
          data: { status: event.target.value },
        })
      ) {
        setStatusEditing(false)
      }
    },
    [mutation, task.id],
  )
  if (!user || (!user.sudo && (!full || task.CreatedBy?.id !== user.id))) {
    return null
  }
  if (editing) {
    return <TaskForm task={task} onCancel={stopEditing} />
  }
  return (
    <div className="actions">
      <TimerControl taskId={task.id} />
      <button type="button" onClick={startEditing}>
        Редактировать
      </button>
      <button type="button" onClick={toggleStatus}>
        Изменить статус
      </button>
      {statusEditing && (
        <select
          aria-label="Статус задачи"
          disabled={mutation.loading}
          value={task.status?.toUpperCase()}
          onChange={changeStatus}
        >
          <option value="NEW">Новая</option>
          <option value="PROGRESS">В работе</option>
          <option value="DONE">Выполнена</option>
          <option value="REJECTED">Отклонена</option>
        </select>
      )}
      {mutation.error && <p role="alert">{mutation.error}</p>}
    </div>
  )
}

export const WorkLogActions: React.FC<{ taskId: string; workLog?: Entry }> = ({
  taskId,
  workLog,
}) => {
  const { user } = useAppContext()
  const [editing, setEditing] = React.useState(false)
  const stopEditing = React.useCallback(() => setEditing(false), [])
  const startEditing = React.useCallback(() => setEditing(true), [])
  if (!user || (workLog && workLog.CreatedBy?.id !== user.id)) {
    return null
  }
  return editing ? (
    <WorkLogForm taskId={taskId} workLog={workLog} onCancel={stopEditing} />
  ) : (
    <p>
      <button type="button" onClick={startEditing}>
        {workLog ? 'Редактировать' : 'Создать ворклог'}
      </button>
    </p>
  )
}

export const CreateTaskLink: React.FC<{ projectId?: string | null }> = ({
  projectId,
}) => {
  const { user } = useAppContext()
  return user ? (
    <p>
      <Link
        to={
          '/tasks/create' +
          (projectId ? '?' + new URLSearchParams({ projectId }) : '')
        }
      >
        Создать задачу
      </Link>
    </p>
  ) : null
}

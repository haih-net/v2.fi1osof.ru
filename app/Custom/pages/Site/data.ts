import type { DocumentNode } from 'graphql'
import {
  ProjectsDocument,
  type ProjectsQuery,
  type ProjectsQueryVariables,
  ProjectPageDataDocument,
  type ProjectPageDataQuery,
  type ProjectPageDataQueryVariables,
  TasksWithCountDocument,
  type TasksWithCountQuery,
  type TasksWithCountQueryVariables,
  TaskDocument,
  type TaskQuery,
  type TaskQueryVariables,
  TaskWorkLogsWithCountDocument,
  type TaskWorkLogsWithCountQuery,
  type TaskWorkLogsWithCountQueryVariables,
  TaskWorkLogDocument,
  type TaskWorkLogQuery,
  type TaskWorkLogQueryVariables,
  ConceptsConnectionDocument,
  type ConceptsConnectionQuery,
  type ConceptsConnectionQueryVariables,
  ConceptDocument,
  type ConceptQuery,
  type ConceptQueryVariables,
  TimersDocument,
  type TimersQuery,
  type TimersQueryVariables,
  UsersConnectionDocument,
  type UsersConnectionQuery,
  type UsersConnectionQueryVariables,
  UserDocument,
  type UserQuery,
  type UserQueryVariables,
  type ProjectNoNestingFragment,
  type TaskFragment,
  type TaskWorkLogFragment,
  type UserFragment,
  type KbConceptFragment,
} from '../../../gql/generated'
import type {
  ApolloClient,
  OperationVariables,
  TypedDocumentNode,
} from '@apollo/client'
import { redirect } from 'react-router'
import { aboutLexicon } from './aboutLexicon'

export type Locale = 'ru' | 'en' | 'vi'
export interface Person {
  id: string
  fullname?: string | null
  username?: string | null
}
export interface Entry {
  id: string
  title?: string | null
  description?: string | null
  intro?: string | null
  content?: string | null
  image?: string | null
  uri?: string
  createdAt?: string
  updatedAt?: string
  commercial?: boolean
  status?: string | null
  createdById?: string
  startedAt?: string
  stoppedAt?: string | null
  CreatedBy?: Person | null
  Assignee?: Person | null
  Project?: Entry | null
  Task?: Entry | null
  WorkLogs?: Entry[] | null
}
export interface PageData {
  locale: Locale
  path: string
  section: string
  page: number
  pageSize: number
  count: number
  items: Entry[]
  item?: Entry | null
  title: string
  description: string
  activeTimer?: Entry | null
}
interface QueryData {
  items?: Entry[] | null
  item?: Entry | null
  count?: number | null
  timers?: Entry[] | null
}
export function locationParts(pathname: string): {
  locale: Locale
  path: string
} {
  const match = pathname.match(/^\/(en|vi)(?=\/|$)/)
  return {
    locale: (match?.[1] as Locale) || 'ru',
    path:
      (match ? pathname.slice(match[0].length) : pathname).replace(/\/$/, '') ||
      '/',
  }
}
export function localized(path: string, locale: Locale): string {
  return locale === 'ru' ? path : `/${locale}${path === '/' ? '' : path}`
}
export const labels: Record<Locale, Record<string, string>> = {
  ru: {
    concepts: 'База знаний',
    projects: 'Проекты',
    tasks: 'Задачи',
    worklogs: 'Журнал',
    timers: 'Таймеры',
    about: 'Обо мне',
    users: 'Пользователи',
    signin: 'Вход',
    tagline: 'инженер-исследователь · публичный журнал',
    name: 'Николай Ланец',
    idle: 'таймер не запущен',
    running: 'таймер запущен',
    next: 'Следующая',
    previous: 'Предыдущая',
    empty: 'Записей пока нет',
    menu: 'Меню',
    personal: 'Личные проекты',
    commercial: 'Коммерческие проекты',
    all: 'Незавершённые',
    New: 'Новая',
    Progress: 'В работе',
    Done: 'Выполнена',
    Rejected: 'Отклонена',
    active: 'активно',
    contact: 'Контакт',
    navigation: 'Навигация',
    footer:
      'Николай Ланец — инженер-исследователь. Публичный журнал проектов, задач и идей.',
    session: 'История сессий',
    started: 'запущен',
    stopped: 'остановлен',
    logout: 'Выйти',
    assignee: 'Исполнитель',
    username: 'Имя пользователя',
    password: 'Пароль',
  },
  en: {
    concepts: 'Knowledge Base',
    projects: 'Projects',
    tasks: 'Tasks',
    worklogs: 'Journal',
    timers: 'Timers',
    about: 'About',
    users: 'Users',
    signin: 'Sign In',
    tagline: 'research engineer · public journal',
    name: 'Nikolai Lanets',
    idle: 'timer not running',
    running: 'timer running',
    next: 'Next',
    previous: 'Previous',
    empty: 'No entries yet',
    menu: 'Menu',
    personal: 'Personal Projects',
    commercial: 'Commercial Projects',
    all: 'Incompleted',
    New: 'New',
    Progress: 'In Progress',
    Done: 'Done',
    Rejected: 'Rejected',
    active: 'active',
    contact: 'Contact',
    navigation: 'Navigation',
    footer:
      'Nikolai Lanets — research engineer. A public journal of projects, tasks and ideas.',
    session: 'Session history',
    started: 'started',
    stopped: 'stopped',
    logout: 'Sign out',
    assignee: 'Assignee',
    username: 'Username',
    password: 'Password',
  },
  vi: {
    concepts: 'Cơ sở kiến thức',
    projects: 'Dự án',
    tasks: 'Nhiệm vụ',
    worklogs: 'Nhật ký',
    timers: 'Bộ đếm thời gian',
    about: 'Về tôi',
    users: 'Người dùng',
    signin: 'Đăng nhập',
    tagline: 'kỹ sư nghiên cứu · nhật ký công khai',
    name: 'Nikolai Lanets',
    idle: 'bộ đếm thời gian không chạy',
    running: 'bộ đếm thời gian đang chạy',
    next: 'Tiếp theo',
    previous: 'Trước',
    empty: 'Chưa có bản ghi',
    menu: 'Menu',
    personal: 'Dự án cá nhân',
    commercial: 'Dự án thương mại',
    all: 'Chưa hoàn thành',
    New: 'Mới',
    Progress: 'Đang tiến hành',
    Done: 'Hoàn thành',
    Rejected: 'Từ chối',
    active: 'đang hoạt động',
    contact: 'Liên hệ',
    navigation: 'Điều hướng',
    footer:
      'Nikolai Lanets — kỹ sư nghiên cứu. Nhật ký công khai về dự án, nhiệm vụ và ý tưởng.',
    session: 'Lịch sử phiên',
    started: 'bắt đầu',
    stopped: 'kết thúc',
    logout: 'Đăng xuất',
    assignee: 'Người thực hiện',
    username: 'Tên người dùng',
    password: 'Mật khẩu',
  },
}
function projectEntry(project: ProjectNoNestingFragment): Entry {
  return { ...project, title: project.name }
}
function taskEntry(task: TaskFragment): Entry {
  return { ...task, Project: task.Project ? projectEntry(task.Project) : null }
}
function workLogEntry(workLog: TaskWorkLogFragment): Entry {
  return { ...workLog, Task: workLog.Task ? taskEntry(workLog.Task) : null }
}
function userEntry(user: UserFragment): Entry {
  return { ...user, title: user.fullname, description: user.intro }
}
function conceptEntry(concept: KbConceptFragment): Entry {
  return { ...concept, title: concept.name }
}

export async function loadPage(
  client: ApolloClient,
  url: URL,
  fetchPolicy: 'no-cache' | 'network-only' = 'no-cache',
): Promise<PageData> {
  const { locale, path } = locationParts(url.pathname)
  if (path === '/work-logs' || path.startsWith('/work-logs/')) {
    throw redirect(
      localized(path.replace('/work-logs', '/worklogs'), locale) + url.search,
      301,
    )
  }
  const page = Number(url.searchParams.get('page') || 1)
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
    throw new Response('Not found', { status: 404 })
  }
  const [section = '', id] = path.slice(1).split('/')
  const pageSize =
    section === 'concepts'
      ? 12
      : section === 'timers'
        ? 30
        : section === 'projects'
          ? 200
          : 20
  const result: PageData = {
    locale,
    path,
    section,
    page,
    pageSize,
    count: 0,
    items: [],
    title: labels[locale][section] || 'Fi1osof',
    description: '',
  }
  if (locale === 'ru') {
    const sections: Record<string, { title: string; description: string }> = {
      '/projects': {
        title: 'Проекты Николая Ланца',
        description:
          'Личные и коммерческие проекты Николая Ланца: веб-разработка, ИИ-агенты и поддержка сайтов. Описание проектов, задачи и ход работы.',
      },
      '/tasks': {
        title: 'Задачи по разработке и развитию проектов',
        description:
          'Публичные задачи Николая Ланца: разработка, исправления и развитие проектов. Текущий статус, описание работ и связанные записи журнала.',
      },
      '/worklogs': {
        title: 'Журнал разработки Николая Ланца',
        description:
          'Рабочие записи Николая Ланца: выполненные задачи, ход разработки и исследования. Практический опыт работы над сайтами и ИИ-проектами.',
      },
      '/timers': {
        title: 'Учёт времени работы над проектами',
        description:
          'Текущие и завершённые рабочие сессии Николая Ланца: учёт времени, задачи и история работы над проектами.',
      },
      '/users': {
        title: 'Участники проектов',
        description:
          'Участники проектов на сайте Николая Ланца: профили, информация о разработчиках и их работе.',
      },
    }
    const sectionMeta = sections[path]
    if (sectionMeta) {
      Object.assign(result, sectionMeta)
    }
  }
  if (path === '/about') {
    result.title = aboutLexicon[locale].seo.title
    result.description = aboutLexicon[locale].seo.description
  }
  const query = async <TData, TVariables extends OperationVariables>(
    document: DocumentNode,
    variables: NoInfer<TVariables>,
  ) =>
    client.query({
      query: document as TypedDocumentNode<TData, TVariables>,
      variables,
      fetchPolicy,
      context: { headers: { 'x-locale': locale } },
    })
  const pagination = { skip: (page - 1) * pageSize, take: pageSize }
  let data: QueryData | undefined
  let detail = false
  if (path === '/projects') {
    if (page > 1) {
      throw new Response('Not found', { status: 404 })
    }
    const response = (
      await query<ProjectsQuery, ProjectsQueryVariables>(ProjectsDocument, {
        take: 200,
      })
    ).data
    data = { items: response?.projects?.map(projectEntry) }
  } else if (path === '/projects/create') {
    result.title = 'Create project'
  } else if (section === 'projects' && id && path.split('/').length === 3) {
    detail = true
    const response = (
      await query<ProjectPageDataQuery, ProjectPageDataQueryVariables>(
        ProjectPageDataDocument,
        { projectId: id },
      )
    ).data
    data = {
      item: response?.project ? projectEntry(response.project) : null,
      items: response?.tasks?.map(taskEntry),
    }
  } else if (path === '/tasks') {
    const status = url.searchParams.get('status')
    if (status && !['NEW', 'PROGRESS', 'DONE', 'REJECTED'].includes(status)) {
      throw new Response('Not found', { status: 404 })
    }
    const response = (
      await query<TasksWithCountQuery, TasksWithCountQueryVariables>(
        TasksWithCountDocument,
        {
          ...pagination,
          where: {
            status: status || undefined,
            incompletedOnly: !status,
            projectId: url.searchParams.get('projectId') || undefined,
          },
        },
      )
    ).data
    data = {
      items: response?.tasks?.map(taskEntry),
      count: response?.tasksCount,
    }
  } else if (path === '/tasks/create') {
    result.title = 'Создать задачу'
  } else if (section === 'tasks' && id && path.split('/').length === 3) {
    detail = true
    const response = (
      await query<TaskQuery, TaskQueryVariables>(TaskDocument, {
        where: { id },
      })
    ).data?.response
    data = {
      item: response
        ? {
            ...taskEntry(response),
            WorkLogs: response.WorkLogs?.map(workLogEntry),
          }
        : null,
    }
  } else if (path === '/worklogs') {
    const response = (
      await query<
        TaskWorkLogsWithCountQuery,
        TaskWorkLogsWithCountQueryVariables
      >(TaskWorkLogsWithCountDocument, pagination)
    ).data
    data = {
      items: response?.taskWorkLogs?.map(workLogEntry),
      count: response?.taskWorkLogCount,
    }
  } else if (section === 'worklogs' && id && path.split('/').length === 3) {
    detail = true
    const response = (
      await query<TaskWorkLogQuery, TaskWorkLogQueryVariables>(
        TaskWorkLogDocument,
        { where: { id } },
      )
    ).data?.response
    data = { item: response ? workLogEntry(response) : null }
  } else if (path === '/concepts') {
    const response = (
      await query<ConceptsConnectionQuery, ConceptsConnectionQueryVariables>(
        ConceptsConnectionDocument,
        { ...pagination, detailedInfo: true },
      )
    ).data
    data = {
      items: response?.concepts.map(conceptEntry),
      count: response?.kBConceptsCount,
    }
  } else if (path === '/timers') {
    const response = (
      await query<TimersQuery, TimersQueryVariables>(TimersDocument, pagination)
    ).data
    data = { items: response?.timers }
  } else if (path === '/users') {
    const response = (
      await query<UsersConnectionQuery, UsersConnectionQueryVariables>(
        UsersConnectionDocument,
        { skip: pagination.skip, first: pagination.take },
      )
    ).data
    data = {
      items: response?.users?.map(userEntry),
      count: response?.usersCount,
    }
  } else if (section === 'users' && id && path.split('/').length === 3) {
    detail = true
    const response = (
      await query<UserQuery, UserQueryVariables>(UserDocument, {
        where: { id },
      })
    ).data?.object
    data = { item: response ? userEntry(response) : null }
  } else if (path !== '/about' && path !== '/signin') {
    result.section = 'concept'
    detail = true
    const response = (
      await query<ConceptQuery, ConceptQueryVariables>(ConceptDocument, {
        where: { uri: path },
      })
    ).data?.concept
    data = { item: response ? conceptEntry(response) : null }
  }
  if (detail && !data?.item) {
    throw new Response('Not found', { status: 404 })
  }
  if (data) {
    result.items = data.items || []
    result.item = data.item
    result.count = data.count ?? result.items.length
    if (!detail && page > 1 && !result.items.length) {
      throw new Response('Not found', { status: 404 })
    }
    if (result.item) {
      result.title = result.item.title || labels[locale][section] || 'Fi1osof'
      result.description = result.item.description || ''
      if (section === 'worklogs') {
        const recordedAt = result.item.createdAt
          ? new Intl.DateTimeFormat(locale, {
              dateStyle: 'medium',
              timeStyle: 'medium',
              timeZone: 'Europe/Moscow',
            }).format(new Date(result.item.createdAt))
          : result.item.id
        result.title = `${result.item.Task?.title || labels[locale].worklogs} — ${recordedAt}`
        result.description = `${labels[locale].worklogs}: ${result.title}. ${labels[locale].name}.`
      }
    }
  }
  const active = await query<TimersQuery, TimersQueryVariables>(
    TimersDocument,
    { activeOnly: true, take: 1 },
  )
  result.activeTimer = active.data?.timers?.[0] || null
  return result
}

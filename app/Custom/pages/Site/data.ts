import { gql, type ApolloClient, type TypedDocumentNode } from '@apollo/client'
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
  items?: Entry[]
  item?: Entry
  count?: number
  timers?: Entry[]
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
const person = 'CreatedBy { id fullname username }'
const content = `id title:name description intro content image createdAt updatedAt ${person}`
const task = `id title description content status createdAt updatedAt Project {id title:name} ${person} Assignee {id fullname username}`
const worklog = `id content createdAt ${person} Task {id title Project {id title:name}}`
const timer = 'id startedAt stoppedAt Task {id title}'
export const activeTimerQuery: TypedDocumentNode<{ timers: Entry[] }> = gql`
  query SiteActiveTimer {
    timers(activeOnly: true, take: 1) {
      id
      startedAt
      stoppedAt
      Task {
        id
        title
      }
    }
  }
`

export async function loadPage(
  client: ApolloClient,
  url: URL,
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
  if (path === '/about') {
    result.title = aboutLexicon[locale].seo.title
    result.description = aboutLexicon[locale].seo.description
  }
  let query = ''
  const variables: Record<string, unknown> = {
    skip: (page - 1) * pageSize,
    take: pageSize,
    where: { id },
    projectId: id,
  }
  if (path === '/projects') {
    query = `{items:projects(take:200){${content} commercial status}}`
  } else if (section === 'projects' && id && path.split('/').length === 3) {
    query = `($where:SiteObjectWhereUniqueInput!,$projectId:String!){item:project(where:$where){${content} commercial status} items:tasks(where:{projectId:$projectId},take:200){${task}}}`
  } else if (path === '/tasks') {
    const status = url.searchParams.get('status')
    if (status && !['NEW', 'PROGRESS', 'DONE', 'REJECTED'].includes(status)) {
      throw new Response('Not found', { status: 404 })
    }
    variables.where = {
      status: status || undefined,
      incompletedOnly: !status,
      projectId: url.searchParams.get('projectId') || undefined,
    }
    query = `($where:SiteTaskWhereInput,$skip:Int,$take:Int){items:tasks(where:$where,skip:$skip,take:$take){${task}} count:tasksCount(where:$where)}`
  } else if (section === 'tasks' && id && path.split('/').length === 3) {
    query = `($where:SiteObjectWhereUniqueInput!){item:task(where:$where){${task} WorkLogs {${worklog}}}}`
  } else if (path === '/worklogs') {
    query = `($skip:Int,$take:Int){items:taskWorkLogs(skip:$skip,take:$take){${worklog}} count:taskWorkLogCount}`
  } else if (section === 'worklogs' && id && path.split('/').length === 3) {
    query = `($where:SiteObjectWhereUniqueInput!){item:taskWorkLog(where:$where){${worklog}}}`
  } else if (path === '/concepts') {
    query = `($skip:Int,$take:Int){items:concepts(skip:$skip,take:$take){${content} uri} count:kBConceptsCount}`
  } else if (path === '/timers') {
    query = `($skip:Int,$take:Int){items:timers(skip:$skip,take:$take){${timer}}}`
  } else if (path === '/users') {
    query =
      '($skip:Int,$take:Int){items:users(skip:$skip,take:$take){id title:fullname description:intro image content username} count:usersCount}'
  } else if (section === 'users' && id && path.split('/').length === 3) {
    query =
      '($where:UserWhereUniqueInput!){item:user(where:$where){id title:fullname description:intro image content createdAt}}'
  } else if (path !== '/about' && path !== '/signin') {
    result.section = 'concept'
    variables.where = { uri: path }
    query = `($where:SiteObjectWhereUniqueInput!){item:concept(where:$where){${content} uri}}`
  }
  if (query) {
    const document: TypedDocumentNode<QueryData, Record<string, unknown>> = gql(
      `query Site${section.replace(/[^a-zA-Z]/g, '') || 'Home'}${id ? 'Detail' : ''} ${query}`,
    )
    const response = await client.query({
      query: document,
      variables,
      fetchPolicy: 'no-cache',
      context: { headers: { 'x-locale': locale } },
    })
    const data = response.data
    const detail = query.includes('item:')
    if (detail && !data?.item) {
      throw new Response('Not found', { status: 404 })
    }
    result.items = data?.items || []
    result.item = data?.item
    result.count = data?.count ?? result.items.length
    if (!detail && page > 1 && !result.items.length) {
      throw new Response('Not found', { status: 404 })
    }
    if (result.item) {
      result.title = result.item.title || labels[locale][section] || 'Fi1osof'
      result.description = result.item.description || ''
    }
  }
  const active = await client.query({
    query: activeTimerQuery,
    fetchPolicy: 'no-cache',
    context: { headers: { 'x-locale': locale } },
  })
  result.activeTimer = active.data?.timers?.[0] || null
  return result
}

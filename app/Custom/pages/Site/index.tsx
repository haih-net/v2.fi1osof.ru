import {
  TaskActions,
  WorkLogActions,
  TaskForm,
  CreateTaskLink,
} from './editing'
import { TimerControl } from '../../components/TimerControl'
import * as React from 'react'
import { Link, useLoaderData, useLocation, useNavigate } from 'react-router'
import { gql, type TypedDocumentNode } from '@apollo/client'
import { useApolloClient, useMutation } from '@apollo/client/react'
import { Markdown } from '../../components/Markdown'
import {
  labels,
  localized,
  type PageData,
  type Entry,
  type Locale,
} from './data'
import { aboutLexicon } from './aboutLexicon'
import { projectsViewLexicon } from './projectsLexicon'
import portrait from './i-am.jpg'
import { PageStyled } from './styles'

function date(value: string | undefined, locale: Locale): string {
  return value
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeZone: 'Europe/Moscow',
      }).format(new Date(value))
    : ''
}
function imagePath(value: string): string {
  return /^(https?:|\/)/.test(value) ? value : `/images/resized/middle/${value}`
}
const signinDocument: TypedDocumentNode<
  {
    signin: { success: boolean; message: string | null; token: string | null }
  },
  { username: string; password: string }
> = gql`
  mutation SiteSignin($username: String!, $password: String!) {
    signin(where: { username: $username }, data: { password: $password }) {
      success
      message
      token
    }
  }
`
const Signin: React.FC<{ locale: Locale }> = ({ locale }) => {
  const [error, setError] = React.useState('')
  const client = useApolloClient()
  const navigate = useNavigate()
  const t = labels[locale]
  const [signin, { loading }] = useMutation(signinDocument)
  const submit = React.useCallback(
    async (event: React.SubmitEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault()
      setError('')
      const form = new FormData(event.currentTarget)
      try {
        const r = await signin({
          variables: {
            username: String(form.get('username') || ''),
            password: String(form.get('password') || ''),
          },
        })
        const auth = r.data?.signin
        if (!auth?.success || !auth.token) {
          setError(auth?.message || 'Sign in failed')
          return
        }
        localStorage.setItem('token', auth.token)
        await client.resetStore()
        await navigate(localized('/', locale))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Sign in failed')
      }
    },
    [signin, client, navigate, locale],
  )
  return (
    <form className="signin article" onSubmit={submit}>
      <h1 tabIndex={-1}>{t.signin}</h1>
      <label>
        {t.username}
        <input name="username" required autoComplete="username" />
      </label>
      <label>
        {t.password}
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="submit" disabled={loading}>
        {loading ? '…' : t.signin}
      </button>
    </form>
  )
}
const Metadata: React.FC<{ item: Entry; locale: Locale }> = ({
  item,
  locale,
}) => (
  <div className="metadata">
    {item.status && (
      <span className="badge" data-status={item.status}>
        {labels[locale][item.status] || item.status}
      </span>
    )}
    {item.createdAt && (
      <time dateTime={item.createdAt}>{date(item.createdAt, locale)}</time>
    )}
    {item.Project && (
      <Link to={localized('/projects/' + item.Project.id, locale)}>
        {item.Project.title}
      </Link>
    )}
    {item.Assignee && (
      <span>
        {labels[locale].assignee}:{' '}
        <Link to={localized('/users/' + item.Assignee.id, locale)}>
          {item.Assignee.fullname || item.Assignee.username}
        </Link>
      </span>
    )}
    {item.CreatedBy && (
      <Link to={localized('/users/' + item.CreatedBy.id, locale)}>
        {item.CreatedBy.fullname || item.CreatedBy.username}
      </Link>
    )}
  </div>
)
const EntryCard: React.FC<{ item: Entry; section: string; locale: Locale }> = ({
  item,
  section,
  locale,
}) => {
  const href = localized(item.uri || `/${section}/${item.id}`, locale)
  if (section === 'projects') {
    return (
      <article className="project-card">
        {item.image && (
          <Link to={href}>
            <img src={imagePath(item.image)} alt="" loading="lazy" />
          </Link>
        )}
        <div>
          <h3>
            <Link to={href}>{item.title}</Link>
            <span className="badge">{labels[locale].active}</span>
          </h3>
          <time className="muted" dateTime={item.createdAt}>
            {date(item.createdAt, locale)}
          </time>
        </div>
      </article>
    )
  }
  if (section === 'timers') {
    return (
      <article className="card">
        <h3>
          <Link to={localized('/tasks/' + item.Task?.id, locale)}>
            {item.Task?.title}
          </Link>
        </h3>
        <TimerControl timer={item} />
        <div className="metadata">
          {labels[locale].started}: {date(item.startedAt, locale)} ·{' '}
          {item.startedAt?.slice(11, 19)}
          {item.stoppedAt && (
            <>
              {' '}
              · {labels[locale].stopped}: {date(item.stoppedAt, locale)} ·{' '}
              {item.stoppedAt.slice(11, 19)}
            </>
          )}
        </div>
      </article>
    )
  }
  return (
    <article className="card">
      {section === 'projects' && item.image && (
        <img
          className="project-image"
          src={imagePath(item.image)}
          alt=""
          loading="lazy"
        />
      )}
      <h2>
        <Link to={href}>
          {section === 'worklogs'
            ? date(item.createdAt, locale)
            : item.title || item.id}
        </Link>
      </h2>
      {section === 'tasks' && <TaskActions key={item.id} task={item} />}
      {section !== 'worklogs' && <Metadata item={item} locale={locale} />}
      <Markdown>
        {section === 'worklogs' ? item.content : item.description || item.intro}
      </Markdown>
      {section === 'worklogs' && item.Task && (
        <Link to={localized('/tasks/' + item.Task.id, locale)}>
          {item.Task.title}
        </Link>
      )}
    </article>
  )
}
export const SitePage: React.FC = () => {
  const page = useLoaderData<PageData>()
  const { locale, section, item, items } = page
  const t = labels[locale]
  const location = useLocation()
  function pageHref(number: number): string {
    const s = new URLSearchParams(location.search)
    if (number === 1) {
      s.delete('page')
    } else {
      s.set('page', String(number))
    }
    return location.pathname + (s.size ? '?' + s : '')
  }
  const detail = Boolean(item)
  const hasNext =
    section === 'timers'
      ? items.length === page.pageSize
      : page.page * page.pageSize < page.count
  const about = aboutLexicon[locale]
  const projects = projectsViewLexicon[locale]
  return (
    <PageStyled data-section={section}>
      {page.path !== '/' && (
        <p className="breadcrumb">
          <Link to={localized('/', locale)}>Fi1osof</Link> /{' '}
          <Link
            to={localized(
              '/' + (section === 'concept' ? 'concepts' : section),
              locale,
            )}
          >
            {t[section === 'concept' ? 'concepts' : section] || page.title}
          </Link>
          {detail && <> / {page.title}</>}
        </p>
      )}
      {page.path === '/tasks/create' ? (
        <>
          <h1>Создать задачу</h1>
          <TaskForm
            projectId={new URLSearchParams(location.search).get('projectId')}
          />
        </>
      ) : section === 'signin' ? (
        <Signin locale={locale} />
      ) : section === 'about' ? (
        <>
          <h1 tabIndex={-1}>{t.about}</h1>
          <div className="about">
            <img src={portrait} alt={about.image.alt} />
            <div>
              <section>
                <h2>{about.section.who.title}</h2>
                <p>{about.section.who.text}</p>
              </section>
              <section>
                <h2>{about.section.experience.title}</h2>
                <p>{about.section.experience.text1}</p>
                <p>
                  {about.section.experience.text2}{' '}
                  <a href="https://modx.club/about">
                    {about.section.experience.modxClub}
                  </a>
                  .
                </p>
              </section>
              <section>
                <h2>{about.section.current.title}</h2>
                <p>{about.section.current.text1}</p>
                <p>{about.section.current.text2}</p>
              </section>
            </div>
          </div>
        </>
      ) : detail && item ? (
        <>
          <article className="article">
            <h1 tabIndex={-1}>{page.title}</h1>
            {section !== 'concept' && <Metadata item={item} locale={locale} />}
            {section === 'tasks' && (
              <TaskActions key={item.id} task={item} full />
            )}
            {section === 'worklogs' && (
              <WorkLogActions
                key={item.id}
                taskId={item.Task?.id || ''}
                workLog={item}
              />
            )}
            <Markdown>{item.content || item.description}</Markdown>
            {section === 'concept' && (
              <Metadata item={item} locale={locale} />
            )}{' '}
            {item.Task && (
              <p>
                <Link to={localized('/tasks/' + item.Task.id, locale)}>
                  {item.Task.title}
                </Link>
              </p>
            )}
          </article>
          {section === 'projects' && <CreateTaskLink projectId={item.id} />}
          {section === 'projects' && items.length > 0 && (
            <>
              <h2>{t.tasks}</h2>
              {items.map((entry) => (
                <EntryCard
                  key={entry.id}
                  item={entry}
                  section="tasks"
                  locale={locale}
                />
              ))}
            </>
          )}
          {item.WorkLogs && item.WorkLogs.length > 0 && (
            <>
              <h2>{t.worklogs}</h2>
              {item.WorkLogs.map((entry) => (
                <EntryCard
                  key={entry.id}
                  item={entry}
                  section="worklogs"
                  locale={locale}
                />
              ))}
            </>
          )}
          {section === 'tasks' && (
            <WorkLogActions key={item.id} taskId={item.id} />
          )}
        </>
      ) : (
        <>
          <h1 tabIndex={-1}>{page.title}</h1>
          {section === 'tasks' && (
            <CreateTaskLink
              projectId={new URLSearchParams(location.search).get('projectId')}
            />
          )}
          {section === 'projects' && (
            <p className="lead">{projects.hero.description}</p>
          )}
          {section === 'tasks' && (
            <nav className="filters" aria-label={t.tasks}>
              {[
                ['', t.all],
                ['NEW', t.New],
                ['PROGRESS', t.Progress],
                ['DONE', t.Done],
                ['REJECTED', t.Rejected],
              ].map(([status, label]) => {
                const q = new URLSearchParams(location.search)
                q.delete('page')
                if (status) {
                  q.set('status', status)
                } else {
                  q.delete('status')
                }
                return (
                  <Link
                    key={status}
                    aria-current={
                      (new URLSearchParams(location.search).get('status') ||
                        '') === status
                        ? 'page'
                        : undefined
                    }
                    to={location.pathname + (q.size ? '?' + q : '')}
                  >
                    {label}
                  </Link>
                )
              })}
            </nav>
          )}
          {section === 'projects'
            ? [true, false].map((commercial) => (
                <section key={String(commercial)}>
                  <h2>
                    {commercial
                      ? projects.sections.commercial
                      : projects.sections.personal}
                  </h2>
                  <div className="grid">
                    {items
                      .filter((entry) => entry.commercial === commercial)
                      .map((entry) => (
                        <EntryCard
                          key={entry.id}
                          item={entry}
                          section={section}
                          locale={locale}
                        />
                      ))}
                  </div>
                </section>
              ))
            : items.map((entry) => (
                <EntryCard
                  key={entry.id}
                  item={entry}
                  section={section}
                  locale={locale}
                />
              ))}
          {!items.length && <p>{t.empty}</p>}
          {(page.page > 1 || hasNext) && (
            <nav className="pagination" aria-label="Pagination">
              {page.page > 1 && (
                <Link to={pageHref(page.page - 1)}>{t.previous}</Link>
              )}
              <span>
                {page.page}
                {section !== 'timers' &&
                  ` / ${Math.ceil(page.count / page.pageSize)}`}
              </span>
              {hasNext && <Link to={pageHref(page.page + 1)}>{t.next}</Link>}
            </nav>
          )}
        </>
      )}
    </PageStyled>
  )
}

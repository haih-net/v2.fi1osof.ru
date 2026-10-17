import React, { useMemo } from 'react'
import { TimerControl } from '../TimerControl'
import {
  Link,
  NavLink,
  useLocation,
  useMatches,
  useNavigate,
} from 'react-router'
import { useApolloClient, useQuery } from '@apollo/client/react'
import {
  activeTimerQuery,
  labels,
  localized,
  locationParts,
  type PageData,
} from '../../pages/Site/data'
import { useAppContext } from '../../hooks/useAppContext'
import { SiteShell } from './styles'
import { ChatProvider } from '../Chat/ChatWidget/context'
import { ChatWidget } from '../Chat/ChatWidget'

const sections = ['concepts', 'projects', 'tasks', 'worklogs', 'about'] as const

export const SiteLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const matches = useMatches()
  const { locale } = locationParts(location.pathname)
  const t = labels[locale]
  const page = matches.at(-1)?.loaderData as PageData | undefined
  const [open, setOpen] = React.useState(false)
  const { user } = useAppContext()
  const client = useApolloClient()
  const timerQuery = useQuery(activeTimerQuery, {
    pollInterval: 5000,
    ssr: false,
    fetchPolicy: 'network-only',
    context: { headers: { 'x-locale': locale } },
  })
  const timer = timerQuery.data
    ? timerQuery.data.timers?.[0]
    : page?.activeTimer
  React.useEffect(() => {
    setOpen(false)
    document.documentElement.lang = locale
    document
      .querySelector<HTMLElement>('main h1')
      ?.focus({ preventScroll: true })
  }, [location.pathname, locale])

  const links = useMemo(() => {
    const links = sections.map((section) => (
      <NavLink key={section} to={localized('/' + section, locale)}>
        {t[section]}
      </NavLink>
    ))

    if (user?.sudo === true) {
      links.push(
        <NavLink key={'admin'} to={localized('/' + 'admin', locale)}>
          Admin
        </NavLink>,
      )
    }

    return links
  }, [locale, t, user])

  const logout = React.useCallback(async (): Promise<void> => {
    localStorage.removeItem('token')
    await client.resetStore()
    await navigate(localized('/', locale))
  }, [client, navigate, locale])
  const toggleMenu = React.useCallback(() => setOpen((value) => !value), [])

  const layout = (
    <SiteShell>
      <header>
        <div className="wrap">
          <div className="header-row">
            <Link className="brand" to={localized('/', locale)}>
              <strong>
                Fi1osof<span className="full-name"> · {t.name}</span>
              </strong>
              <small>{t.tagline}</small>
            </Link>
            <Link
              className="timer"
              to={localized('/timers', locale)}
              title={timer?.Task?.title || t.idle}
            >
              ● {timer ? timer.Task?.title || t.running : t.idle}
            </Link>
            {timer && <TimerControl timer={timer} />}
            <nav className="desktop-nav" aria-label={t.navigation}>
              {links}
            </nav>
            <button
              type="button"
              className="burger"
              aria-label={t.menu}
              aria-expanded={open}
              aria-controls="mobile-navigation"
              onClick={toggleMenu}
            >
              ☰
            </button>
          </div>
          {open && (
            <nav
              id="mobile-navigation"
              className="mobile-nav"
              aria-label={t.menu}
            >
              {links}
            </nav>
          )}
        </div>
      </header>
      <main className="wrap" id="main-content">
        {children}
      </main>
      <footer>
        <div className="wrap">
          <div className="footer-grid">
            <div>
              <h3>fi1osof</h3>
              <p className="muted">{t.footer}</p>
            </div>
            <nav aria-label={t.navigation}>
              <p className="caption">{t.navigation}</p>
              {links}
            </nav>
            <div>
              <p className="caption">{t.contact}</p>
              <p>
                <a
                  href="https://github.com/fi1osof"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub · Fi1osof
                </a>
              </p>
              <p>
                <a href="https://t.me/Fi1osof" target="_blank" rel="noreferrer">
                  Telegram · Fi1osof
                </a>
              </p>
            </div>
          </div>
          <div className="account">
            {user ? (
              <>
                <Link to={localized('/users/' + user.id, locale)}>
                  {user.fullname || user.username}
                </Link>
                <button type="button" onClick={logout}>
                  {t.logout}
                </button>
              </>
            ) : (
              <Link to={localized('/signin', locale)}>{t.signin}</Link>
            )}
          </div>
          <p className="muted">
            © {new Date().getUTCFullYear()} fi1osof.ru · {t.tagline}
          </p>
        </div>
      </footer>
    </SiteShell>
  )

  return (
    <ChatProvider>
      {layout}

      <ChatWidget />
    </ChatProvider>
  )
}

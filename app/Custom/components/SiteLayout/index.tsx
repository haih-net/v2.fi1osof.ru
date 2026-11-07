import React, { useMemo } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { useApolloClient } from '@apollo/client/react'
import { labels, localized, locationParts } from '../../pages/Site/data'
import { useAppContext } from '../../hooks/useAppContext'
import { SiteShell } from './styles'
import { ChatProvider } from '../Chat/ChatWidget/context'
import { FeedbackForm } from '../Feedback'
import { ChatWidget } from '../Chat/ChatWidget'

const ContactButton: React.FC = () => {
  const { openFeedback: open } = useAppContext() ?? {}
  return (
    <button
      className="contact-button"
      type="button"
      onClick={open}
      disabled={!open}
    >
      Написать мне
    </button>
  )
}

const sections = ['about', 'projects', 'worklogs', 'concepts'] as const

export const SiteLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { locale } = locationParts(location.pathname)
  const t = labels[locale]
  const [open, setOpen] = React.useState(false)
  const { user } = useAppContext() ?? {}
  const client = useApolloClient()

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
        <NavLink key={'admin'} to={localized('/admin-panel', locale)}>
          Admin
        </NavLink>,
      )
    }

    return links
  }, [locale, t, user])

  const closeMenu = React.useCallback((): void => setOpen(false), [])

  const primaryLinks = (
    <>
      <NavLink to="/solutions" onClick={closeMenu}>
        Решения
      </NavLink>
      <NavLink to="/clients" onClick={closeMenu}>
        Клиенты
      </NavLink>
      <NavLink to="/prices" onClick={closeMenu}>
        Цены
      </NavLink>
      <a href="https://t.me/Fi1osof" target="_blank" rel="noopener noreferrer">
        Telegram ↗
      </a>
    </>
  )

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
                Fi<span className="brand-accent">1</span>osof
              </strong>
              <span className="full-name">{t.name}</span>
            </Link>
            <nav className="desktop-nav" aria-label={t.navigation}>
              {primaryLinks}
            </nav>
            <ContactButton />
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
              {primaryLinks}
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
              <Link className="brand" to={localized('/', locale)}>
                <strong>
                  Fi<span className="brand-accent">1</span>osof
                </strong>
                <span>{t.name}</span>
              </Link>
              <p className="muted">
                Футурист, программист, исследователь, ИТ / ИИ-консультант
              </p>
            </div>
            <nav aria-label={t.navigation}>
              {links}
              <Link to="/terms">Термины и технологии</Link>
            </nav>
            <div>
              <p>
                <a
                  href="https://github.com/fi1osof"
                  target="_blank"
                  rel="noreferrer"
                >
                  GitHub: Fi1osof
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
          <p className="muted">© {new Date().getUTCFullYear()} fi1osof.ru</p>
          <p className="muted">
            Вся информация, размещенная на сайте, включая цены на товары,
            наличие, условия доставки, сборки и т.д.- не является публичной
            офертой с определениями статей 437 Гражданского Кодекса РФ и другими
            статьями действующего законодательства.
          </p>
        </div>
      </footer>
      <FeedbackForm />
      <ChatWidget />
    </SiteShell>
  )

  return <ChatProvider>{layout}</ChatProvider>
}

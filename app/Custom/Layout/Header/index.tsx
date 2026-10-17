import { useCallback, useEffect, useRef, useState } from 'react'
import type * as React from 'react'
import { Link, useLocation } from 'react-router'
import { useOpenChatWithMessage } from '../../components/Chat/hooks/useOpenChatWithMessage'
import { HeaderStyled } from './styles'
import { theme } from '../../theme'
import { useAppContext } from '../../hooks/useAppContext'

export const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  const header = useRef<HTMLElement>(null)
  const location = useLocation()
  const { user, userLoading } = useAppContext()

  const openChat = useOpenChatWithMessage()
  const handleOpenChat = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      openChat(event)
      setIsOpen(false)
    },
    [openChat],
  )

  const closeMenu = useCallback(() => setIsOpen(false), [])
  const toggleMenu = useCallback(() => setIsOpen((previous) => !previous), [])
  const handleBlur = useCallback((event: React.FocusEvent<HTMLElement>) => {
    if (
      !event.currentTarget.contains(event.relatedTarget) &&
      event.relatedTarget !== toggle.current
    ) {
      setIsOpen(false)
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        toggle.current?.focus()
      }
    }
    const onPointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !header.current?.contains(event.target)
      ) {
        setIsOpen(false)
      }
    }
    const media = window.matchMedia(`(min-width: ${theme.breakpoints.sm}px)`)
    const onResize = () => {
      if (media.matches) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    media.addEventListener('change', onResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
      media.removeEventListener('change', onResize)
    }
  }, [isOpen])

  return (
    <HeaderStyled ref={header}>
      <div className="header-inner">
        <div>
          <Link to={'/'}>Главная</Link>
        </div>
        <button
          ref={toggle}
          type="button"
          className="menu-toggle"
          aria-label={isOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={isOpen}
          aria-controls="main-navigation"
          onClick={toggleMenu}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path
              d={isOpen ? 'M18 6 6 18M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
            />
          </svg>
        </button>
        <nav
          id="main-navigation"
          aria-label="Основная навигация"
          data-open={isOpen}
          onBlur={handleBlur}
        >
          {!userLoading && user?.sudo === true && (
            <Link
              to="/admin"
              onClick={closeMenu}
              aria-current={
                location.pathname === '/admin'
                  ? 'page'
                  : location.pathname.startsWith('/admin/')
                    ? 'location'
                    : undefined
              }
            >
              Админка
            </Link>
          )}
          {location.pathname === '/ai' ? (
            <Link to="/ai" className="ai-button" onClick={closeMenu}>
              Спросить ИИ <span aria-hidden="true">↗</span>
            </Link>
          ) : (
            <button
              type="button"
              className="ai-button"
              onClick={handleOpenChat}
            >
              Спросить ИИ <span aria-hidden="true">↗</span>
            </button>
          )}
        </nav>
      </div>
    </HeaderStyled>
  )
}

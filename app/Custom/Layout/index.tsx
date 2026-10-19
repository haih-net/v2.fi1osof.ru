import type * as React from 'react'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router'
import { ChatProvider } from '../components/Chat/ChatWidget/context'
import { ChatWidget } from '../components/Chat/ChatWidget'
import { FeedbackForm } from '../components/Feedback'
import { Header } from './Header'
import { Footer } from './Footer'
import { CustomLayoutMainStyled, CustomLayoutStyled } from './styles'

export const Layout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const location = useLocation()
  const action = useNavigationType()
  const previousPath = useRef(location.pathname)

  useEffect(() => {
    if (previousPath.current !== location.pathname && action !== 'POP') {
      document
        .querySelector<HTMLElement>('#main-content h1')
        ?.focus({ preventScroll: true })
    }
    previousPath.current = location.pathname
  }, [location.pathname, action])

  return (
    <ChatProvider>
      <CustomLayoutStyled>
        <a className="skip-link" href="#main-content">
          К содержимому
        </a>
        <Header key={location.key} />
        <CustomLayoutMainStyled id="main-content" tabIndex={-1}>
          {children}
        </CustomLayoutMainStyled>
        <Footer />
        <FeedbackForm />
        {location.pathname !== '/ai' && <ChatWidget />}
      </CustomLayoutStyled>
    </ChatProvider>
  )
}

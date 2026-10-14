import { App as CustomApp } from './Custom/components/pages/_App'
import { Statistics } from './components/Statistics'
import { errorPageStatusCode } from './components/Statistics/status'
import { HtmlStyled } from './components/Layout/styles'
import { SeoHeaders, unavailableSeoMeta } from './components/seo/SeoHeaders'

export const meta = unavailableSeoMeta
import type { ReactNode } from 'react'
import { Layout as SiteLayout } from './components/Layout'
import {
  Links,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from 'react-router'

const betterlyticsId = import.meta.env.BETTERLYTICS_SITE_ID

export function Layout({ children }: { children: ReactNode }) {
  return (
    <HtmlStyled lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <SeoHeaders />
        <Links />
        {betterlyticsId && (
          <script
            async
            src="https://panel.betterlytics.ru/analytics.js"
            data-site-id={betterlyticsId}
            data-server-url="https://panel.betterlytics.ru/event"
          />
        )}
      </head>
      <body>
        <CustomApp>
          <SiteLayout>{children}</SiteLayout>
        </CustomApp>
        <ScrollRestoration />
        <Scripts />
      </body>
    </HtmlStyled>
  )
}
export default function App() {
  return (
    <>
      <Outlet />
      <Statistics />
    </>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()
  return (
    <>
      <Statistics statusCode={errorPageStatusCode(error)} />
      <h1 tabIndex={-1}>
        {isRouteErrorResponse(error)
          ? `${error.status} ${error.statusText}`
          : 'Something went wrong'}
      </h1>
      <p>Please reload the page to retry.</p>
      <a href="/">Return home</a>
    </>
  )
}

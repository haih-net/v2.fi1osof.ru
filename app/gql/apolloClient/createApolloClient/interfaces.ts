// import { AppContext } from 'next/app'

type AppContext = object | undefined

export type createApolloClientProps = {
  withWs: boolean

  /**
   * Application context. May be necessary for
   * forming correct headers when making API requests
   * on the server side in SSR mode
   */
  appContext?: AppContext
}

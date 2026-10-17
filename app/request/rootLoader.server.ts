import type { NormalizedCacheObject } from '@apollo/client'
import type { LoaderFunctionArgs } from 'react-router'
import { requestContext } from './context.server'

export interface RootLoaderData {
  readonly initialApolloState: NormalizedCacheObject | undefined
}

export function loadRoot({ context }: LoaderFunctionArgs): RootLoaderData {
  const services = context.get(requestContext)
  return {
    // Loaders run in parallel. Read the shared cache when rendering/serializing
    // their completed results, rather than taking a snapshot in this loader.
    get initialApolloState(): NormalizedCacheObject | undefined {
      return services.getApolloState()
    },
  }
}

import { createContext, type Context } from 'react'
import type { ApolloClient } from '@apollo/client'

export const RequestApolloContext: Context<(() => ApolloClient) | undefined> =
  createContext<(() => ApolloClient) | undefined>(undefined)

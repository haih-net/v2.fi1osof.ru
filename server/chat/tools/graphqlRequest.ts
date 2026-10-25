import { getOperationAST, parse } from 'graphql'
import type { ChatTool, ToolDefinition } from '../types'

const definition: ToolDefinition = {
  type: 'function',
  function: {
    name: 'graphql_request',
    description: `Читай GraphQL API сайта с правами текущего пользователя (без авторизации — как анонимный посетитель). Перед поиском изучи доступные поля и фильтры через интроспекцию. Поддерживаются только запросы на чтение.`,
    parameters: {
      type: 'object',
      properties: {
        reasoning: {
          type: 'string',
          description: `Кратко объясни пользователю на его языке, зачем нужен этот запрос.`,
        },
        query: {
          type: 'string',
          description: `Запрос GraphQL, в том числе запрос интроспекции.`,
        },
        variables: { type: 'object', additionalProperties: true },
        operationName: { type: 'string' },
      },
      required: ['reasoning', 'query'],
      additionalProperties: false,
    },
  },
}

interface GraphqlArguments {
  reasoning: string
  query: string
  variables?: Record<string, unknown>
  operationName?: string
}

export const graphqlRequestTool: ChatTool = {
  definition,
  prepare(args) {
    if (typeof args.query !== 'string' || !args.query.trim()) {
      throw new Error('A GraphQL query is required')
    }
    if (
      args.variables !== undefined &&
      (!args.variables ||
        typeof args.variables !== 'object' ||
        Array.isArray(args.variables))
    ) {
      throw new Error('Variables must be an object')
    }
    if (
      args.operationName !== undefined &&
      typeof args.operationName !== 'string'
    ) {
      throw new Error('Invalid operationName')
    }
    const input: GraphqlArguments = {
      reasoning: args.reasoning,
      query: args.query,
      variables: args.variables as Record<string, unknown> | undefined,
      operationName: args.operationName as string | undefined,
    }
    return {
      reasoning: input.reasoning,
      execute: ({ endpoint, signal, authorization }) =>
        executeGraphql(input, endpoint, signal, authorization),
    }
  },
}

export async function executeGraphql(
  args: GraphqlArguments,
  endpoint: string | undefined,
  signal: AbortSignal,
  authorization?: string,
): Promise<string> {
  if (!endpoint?.trim()) {
    throw new Error('GraphQL endpoint is not configured')
  }
  const operation = getOperationAST(parse(args.query), args.operationName)
  if (!operation || operation.operation !== 'query') {
    throw new Error('Only read-only GraphQL queries are supported')
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify({
      query: args.query,
      variables: args.variables,
      operationName: args.operationName,
    }),
    signal,
    redirect: 'error',
  })
  const result = await response.text()
  if (result.length > 128000) {
    throw new Error(
      'API result is too large; narrow the query or use pagination',
    )
  }
  try {
    JSON.parse(result)
  } catch {
    throw new Error(
      `API returned an invalid response (HTTP ${response.status})`,
    )
  }
  return result
}

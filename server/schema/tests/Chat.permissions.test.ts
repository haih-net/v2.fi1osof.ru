import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import type { Request } from 'express'
import type { Knex } from 'knex'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDatabase } from '../../database'
import { createContext } from '../../context'
import { chatStorage, ChatStorage } from '../../chat/storage'
import { createToken } from '../types/User/helpers/auth'
import type { UserRecord } from '../types/User/interfaces'
import { schema } from '../index'

const { graphql } = createRequire(import.meta.url)(
  'graphql',
) as typeof import('graphql')

describe.each(['guest', 'authenticated', 'sudo'] as const)(
  '%s chat permissions',
  (kind) => {
    let db: Knex
    let token: string
    let otherToken: string
    let chatId: string
    let authToken: string | undefined

    beforeEach(async () => {
      vi.stubEnv('JWT_SECRET', 'chat-permissions-test-secret')
      db = createDatabase()
      const storage = new ChatStorage(db)
      token = await storage.issue()
      otherToken = await storage.issue()
      chatId = token.split('.')[0]
      authToken = undefined
      if (kind !== 'guest') {
        const [user] = await db<UserRecord>('User')
          .insert({
            id: randomUUID(),
            status: 'active',
            sudo: kind === 'sudo',
          })
          .returning('*')
        authToken = await createToken(user, db)
      }
      for (const id of [chatId, otherToken.split('.')[0]]) {
        for (const role of [
          'user',
          'assistant',
          'tool_call',
          'tool',
        ] as const) {
          await storage.append(id, {
            id: role,
            role,
            content: `${id}:${role}`,
            createdAt: new Date().toISOString(),
          })
        }
      }
      vi.spyOn(chatStorage, 'verify').mockImplementation((header) =>
        storage.verify(header),
      )
      vi.spyOn(chatStorage, 'read').mockImplementation((id) => storage.read(id))
      vi.spyOn(chatStorage, 'listDialogues').mockImplementation(() =>
        storage.listDialogues(),
      )
      vi.spyOn(chatStorage, 'listMessages').mockImplementation(() =>
        storage.listMessages(),
      )
    })

    afterEach(async () => {
      vi.restoreAllMocks()
      vi.unstubAllEnvs()
      await db.destroy()
    })

    async function execute(
      source: string,
      variables: Record<string, unknown> = {},
      bearer: string | null | undefined = authToken,
      dialogToken?: string,
    ) {
      const contextValue = await createContext(
        {
          headers: {
            ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
            ...(dialogToken ? { 'dialog-token': dialogToken } : {}),
          },
        } as Request,
        db,
      )
      if (bearer === authToken) {
        expect(contextValue.currentUser?.sudo ?? null).toBe(
          kind === 'guest' ? null : kind === 'sudo',
        )
      }
      return graphql({
        schema,
        source,
        variableValues: variables,
        contextValue,
      })
    }

    const history =
      'query($id:String!,$token:String){chatMessages(chatId:$id,token:$token){id role content}}'
    const single =
      'query($id:String!,$token:String,$message:String!){chatMessage(chatId:$id,token:$token,messageId:$message){id role content}}'

    it.each(['own', 'other', 'invalid', 'missing'] as const)(
      'checks %s token for history and individual messages',
      async (access) => {
        const supplied = {
          own: token,
          other: otherToken,
          invalid: `${token}bad`,
          missing: undefined,
        }[access]
        const allowed = kind === 'sudo' || access === 'own'
        for (const source of [history, single]) {
          const result = await execute(source, {
            id: chatId,
            token: supplied,
            message: 'user',
          })
          if (allowed) {
            expect(result.errors).toBeUndefined()
            if (source === history) {
              expect(result.data?.chatMessages).toEqual(
                (kind === 'sudo'
                  ? ['user', 'assistant', 'tool_call', 'tool']
                  : ['user', 'assistant']
                ).map((role) => ({
                  id: role,
                  role,
                  content: `${chatId}:${role}`,
                })),
              )
            } else {
              expect(result.data?.chatMessage).toEqual({
                id: 'user',
                role: 'user',
                content: `${chatId}:user`,
              })
            }
          } else {
            expect(result.errors?.[0].message).toBe('Доступ запрещён')
            expect(chatStorage.read).not.toHaveBeenCalled()
          }
        }
      },
    )

    it('restricts global indexes to sudo even with a dialogue token', async () => {
      for (const source of [
        '{chatDialogues{chatId}}',
        '{chatMessageIndexes{id}}',
      ]) {
        const result = await execute(source)
        if (kind === 'sudo') {
          expect(result.errors).toBeUndefined()
          expect(Object.values(result.data ?? {})[0]).toHaveLength(
            source.includes('chatDialogues') ? 2 : 4,
          )
        } else {
          expect(result.errors?.[0].message).toBe('Доступ запрещён')
        }
        const guest = await execute(source, {}, token)
        expect(guest.errors?.[0].message).toBe('Доступ запрещён')
      }
      if (kind !== 'sudo') {
        expect(chatStorage.listDialogues).not.toHaveBeenCalled()
        expect(chatStorage.listMessages).not.toHaveBeenCalled()
      }
    })

    it('keeps tool records private when fetched by message id', async () => {
      for (const message of ['tool_call', 'tool']) {
        const result = await execute(single, { id: chatId, token, message })
        expect(result.errors).toBeUndefined()
        expect(result.data?.chatMessage).toEqual(
          kind === 'sudo'
            ? { id: message, role: message, content: `${chatId}:${message}` }
            : null,
        )
      }
    })

    it('checks each aliased dialogue independently', async () => {
      const result = await execute(
        `query($id:String!,$other:String!,$token:String!){
      own:chatMessage(chatId:$id,token:$token,messageId:"user"){content}
      foreign:chatMessage(chatId:$other,token:$token,messageId:"user"){content}
      invalid:chatMessage(chatId:$id,token:"invalid",messageId:"user"){content}
    }`,
        { id: chatId, other: otherToken.split('.')[0], token },
      )
      expect(result.data?.own).toEqual({ content: `${chatId}:user` })
      if (kind === 'sudo') {
        expect(result.errors).toBeUndefined()
        expect(result.data?.foreign).toEqual({
          content: `${otherToken.split('.')[0]}:user`,
        })
        expect(result.data?.invalid).toEqual(result.data?.own)
      } else {
        expect(result.errors).toHaveLength(2)
        expect(result.data?.foreign).toBeNull()
        expect(result.data?.invalid).toBeNull()
        expect(chatStorage.read).toHaveBeenCalledExactlyOnceWith(chatId)
      }
    })

    it('accepts a dialog-token header and rejects an explicit foreign token overriding it', async () => {
      for (const source of [history, single]) {
        const result = await execute(
          source,
          { id: chatId, message: 'user' },
          null,
          token,
        )
        expect(result.errors).toBeUndefined()
        const denied = await execute(
          source,
          { id: chatId, message: 'user', token: otherToken },
          null,
          token,
        )
        expect(denied.errors?.[0].message).toBe('Доступ запрещён')
      }
    })
  },
)

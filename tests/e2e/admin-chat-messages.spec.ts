import { test, expect } from '@playwright/test'

for (const sudo of [false, true]) {
  test(`журнал чата: sudo=${sudo}, доступ и постраничная загрузка`, async ({
    page,
  }) => {
    const details: string[] = []
    const operations: string[] = []
    const entries = Array.from({ length: 21 }, (_, index) => ({
      __typename: 'ChatMessageIndex',
      id: `message-${index}`,
      chatId: 'a'.repeat(48),
      role: index % 2 ? 'assistant' : 'user',
      success: index === 20 ? false : index === 0 ? null : true,
      status: index === 20 ? 'error' : index === 0 ? 'unknown' : 'success',
      createdAt: '2026-10-16T12:00:00.000Z',
      pageUrl: null,
      usage: null,
    }))
    await page.route(/\/api\/?$/, async (route) => {
      const { operationName, variables } = route.request().postDataJSON() as {
        operationName: string
        variables: { messageId: string }
      }
      operations.push(operationName)
      let data: Record<string, unknown>
      switch (operationName) {
        case 'me':
          data = {
            me: {
              __typename: 'User',
              id: 'test-admin',
              username: 'admin',
              fullname: null,
              sudo,
              status: 'active',
            },
          }
          break
        case 'chatMessageIndexes':
          data = { chatMessageIndexes: entries }
          break
        case 'chatMessage':
          details.push(variables.messageId)
          data = {
            chatMessage: {
              __typename: 'ChatMessage',
              pageUrl: null,
              usage: null,
              id: variables.messageId,
              role: 'user',
              createdAt: entries[0].createdAt,
              content: `Текст ${variables.messageId}`,
              success: true,
              replyToId: null,
            },
          }
          break
        case 'chatMessages':
          data = {
            chatMessages: [
              {
                __typename: 'ChatMessage',
                pageUrl: null,
                usage: null,
                id: 'message-0',
                role: 'user',
                createdAt: entries[0].createdAt,
                content: 'Полный диалог',
                success: false,
                replyToId: 'question-id',
              },
            ],
          }
          break
        default:
          await route.continue()
          return
      }
      await route.fulfill({ json: { data } })
    })
    const response = await page.goto('/admin-panel')
    expect(response?.status()).toBe(200)
    if (!sudo) {
      await expect(
        page.getByText('Доступ разрешён только администраторам.'),
      ).toBeVisible()
      await expect(page.locator('article.message-card')).toHaveCount(0)
      expect(operations).not.toContain('chatMessageIndexes')
      expect(details).toEqual([])
      await expect(
        page.getByRole('link', { name: 'Админка', exact: true }),
      ).toHaveCount(0)
      await expect(
        page.getByRole('link', { name: /Сообщения чата/ }),
      ).toHaveCount(0)
      return
    }
    await expect(
      page.getByRole('link', { name: /Сообщения чата/ }),
    ).toBeVisible()
    const menuToggle = page.getByRole('button', { name: 'Открыть меню' })
    if (await menuToggle.isVisible()) {
      await menuToggle.click()
    }
    await page.getByLabel('Меню пользователя: admin', { exact: true }).click()
    const adminLink = page
      .getByRole('navigation', { name: 'Основная навигация' })
      .getByRole('link', { name: 'Админка', exact: true })
    await expect(adminLink).toBeVisible()
    await adminLink.click()
    await page.getByRole('link', { name: /Сообщения чата/ }).click()
    await expect(page).toHaveURL(/\/admin-panel\/chat\/messages$/)
    await expect(page.locator('article.message-card')).toHaveCount(10)
    await expect(
      page
        .locator('article.message-card')
        .first()
        .getByText('Ошибка', { exact: true }),
    ).toBeVisible()
    await expect(
      page.getByText('Текст message-20', { exact: true }),
    ).toBeVisible()
    await expect.poll(() => details.length).toBe(10)
    expect(details).not.toContain('message-0')
    await page.getByRole('button', { name: 'Далее' }).click()
    await expect(page.locator('article.message-card')).toHaveCount(10)
    await expect(
      page.getByText('Текст message-1', { exact: true }),
    ).toBeVisible()
    await expect.poll(() => details.length).toBe(20)
    expect(details).not.toContain('message-0')
    await page.getByRole('button', { name: 'Далее' }).click()
    await expect(page.locator('article.message-card')).toHaveCount(1)
    await expect(page.getByText('Не записан', { exact: true })).toBeVisible()
    await expect(
      page.getByText('Текст message-0', { exact: true }),
    ).toBeVisible()
    expect(details).toHaveLength(21)
    await page.getByRole('link', { name: 'Открыть диалог' }).click()
    await expect(page).toHaveURL(
      new RegExp(`/admin-panel/chat/dialogues/${'a'.repeat(48)}$`),
    )
    await expect(page.getByText('Полный диалог', { exact: true })).toBeVisible()
    await expect(
      page.locator('[data-role="user"][data-success="false"]'),
    ).toBeVisible()
    await expect(
      page.getByText('Ответ на: question-id', { exact: true }),
    ).toBeVisible()
    await page.reload()
    await expect(page.getByText('Полный диалог', { exact: true })).toBeVisible()
    await page.getByRole('link', { name: '← Сообщения чата' }).click()
    await expect(page).toHaveURL(/\/admin-panel\/chat\/messages$/)
  })
}

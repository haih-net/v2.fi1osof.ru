import type { ChatTool } from '../types'

export const getSystemInfoTool: ChatTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_system_info',
      description: `Получи публичные сведения о разработчике помощника, модели и провайдере. Вызывай при вопросах о том, кто создал помощника, какая модель используется и на чём он работает. Выводи ссылки из результата в Markdown, сохраняя их текст и адрес целиком, включая referral-параметр.`,
      parameters: {
        type: 'object',
        properties: {
          reasoning: {
            type: 'string',
            description: `Кратко объясни пользователю, зачем запрашиваешь сведения о помощнике.`,
          },
        },
        required: ['reasoning'],
        additionalProperties: false,
      },
    },
  },
  prepare: ({ reasoning }) => ({
    reasoning,
    execute: async ({ signal, config }) => {
      signal.throwIfAborted()
      return JSON.stringify({
        content: `Разработал Ланец Николай, он же Fi1osof. Его сайт: [https://fi1osof.ru/](https://fi1osof.ru/).
Модель: ${config.model || 'gemini-3.1-flash-lite'}. Провайдер: [https://polza.ai](https://polza.ai/?referral=dX1Tzof3E6).`,
      })
    },
  }),
}

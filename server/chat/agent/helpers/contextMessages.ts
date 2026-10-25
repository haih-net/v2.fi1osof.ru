import type { Message } from '../../storage'

export const contextMessages = (
  history: Message[],
  message: Message,
): Message[] => {
  history = history.filter(
    ({ role }) => role === 'user' || role === 'assistant',
  )
  const context: Message[] = [message]
  let length = message.content.length
  for (
    let index = history.length - 1;
    index > 0 && context.length < 39;
    index -= 1
  ) {
    const answer = history[index]
    if (answer.role !== 'assistant' || answer.success === false) {
      continue
    }
    const question = answer.replyToId
      ? history
          .slice(0, index)
          .find(
            (entry) => entry.id === answer.replyToId && entry.role === 'user',
          )
      : history[index - 1]
    if (!question || question.role !== 'user') {
      continue
    }
    const pair = [question, answer]
    const size = pair.reduce((sum, item) => sum + item.content.length, 0)
    if (length + size > 64000) {
      break
    }
    context.unshift(...pair)
    length += size
  }
  return context
}

import { chatErrorMessage } from '../../../../app/Custom/components/Chat/lib/errors'
import { logDevError } from '../../../errorLogging'

interface ProviderDiagnostics {
  chatId: string
  messageId: string
  model: string
  providerUrl: string
  providerRequestId: string | null
}

interface ProviderFailure {
  status: number
  message: string
  body?: string
}

export async function readProviderError(
  upstream: Response,
  stream: boolean,
  diagnostics: ProviderDiagnostics,
): Promise<ProviderFailure | undefined> {
  if (
    upstream.ok &&
    upstream.body &&
    upstream.headers
      .get('content-type')
      ?.includes(stream ? 'text/event-stream' : 'application/json')
  ) {
    return
  }
  const { chatId, messageId, model, providerUrl, providerRequestId } =
    diagnostics
  const providerStatus = upstream.status
  let responseBody: string | undefined
  try {
    responseBody = await upstream.text()
  } catch (error) {
    logDevError('chat.provider_body', error, {
      chatId,
      messageId,
      providerStatus,
    })
  }
  if (process.env.NODE_ENV === 'development') {
    logDevError(
      'chat.provider_response',
      new Error(
        stream
          ? 'Провайдер не вернул потоковый ответ'
          : 'Провайдер не вернул JSON-ответ',
      ),
      {
        chatId,
        messageId,
        model,
        providerUrl,
        status: upstream.status,
        statusText: upstream.statusText,
        contentType: upstream.headers.get('content-type'),
        providerRequestId,
        responseBody,
      },
    )
  }
  const failureStatus = upstream.status === 429 ? 429 : 502
  let publicError = stream
    ? 'Провайдер не вернул потоковый ответ'
    : 'Провайдер не вернул JSON-ответ'
  if (responseBody) {
    try {
      publicError = chatErrorMessage(
        JSON.parse(responseBody) as unknown,
        publicError,
      )
    } catch {
      if (upstream.headers.get('content-type')?.includes('text/plain')) {
        publicError = responseBody
      }
    }
  }
  return { status: failureStatus, message: publicError, body: responseBody }
}

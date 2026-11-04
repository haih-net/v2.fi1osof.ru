import { createServer, type Server } from 'node:net'
import { createInterface } from 'node:readline/promises'
import { listen } from '../server/listen'

function isPortBusy(error: unknown): boolean {
  return (
    error instanceof Error && 'code' in error && error.code === 'EADDRINUSE'
  )
}

async function findAvailablePort(start: number): Promise<number> {
  for (let port = start; port <= 65535; port++) {
    const probe = createServer()
    try {
      await listen(probe, port)
    } catch (error) {
      if (isPortBusy(error)) {
        continue
      }
      throw error
    }
    await new Promise<void>((resolve, reject) => {
      probe.close((error) => (error ? reject(error) : resolve()))
    })
    return port
  }
  throw new Error('Нет доступных портов до 65535')
}

export async function listenWithPortFallback(
  server: Server,
  configuredPort: string | undefined,
): Promise<number> {
  const explicitPort = Boolean(configuredPort)
  let port = Number(configuredPort || 3000)
  for (;;) {
    try {
      return await listen(server, port)
    } catch (error) {
      if (explicitPort || !isPortBusy(error)) {
        throw error
      }
      if (!process.stdin.isTTY || !process.stdout.isTTY) {
        throw new Error(
          `Порт ${port} занят. Для выбора другого порта нужен интерактивный терминал. Укажите PORT явно.`,
          { cause: error },
        )
      }
      const nextPort = await findAvailablePort(port + 1)
      const prompt = createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      try {
        const answer = await prompt.question(
          `Порт ${port} занят, открыть на ${nextPort} порту? [Y/n] `,
        )
        if (
          !['', 'y', 'yes', 'д', 'да'].includes(answer.trim().toLowerCase())
        ) {
          throw new Error('Запуск сервера отменён')
        }
      } finally {
        prompt.close()
      }
      port = nextPort
    }
  }
}

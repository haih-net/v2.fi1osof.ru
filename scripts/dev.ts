import '../server/env'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { constants } from 'node:os'
import { fileURLToPath } from 'node:url'
import { listenWithPortFallback } from './devPort'

async function main(): Promise<void> {
  const probe = createServer()
  const port = await listenWithPortFallback(probe, process.env.PORT)
  await new Promise<void>((resolve, reject) => {
    probe.close((error) => (error ? reject(error) : resolve()))
  })
  process.stdin.pause()

  const watcher = spawn(
    process.execPath,
    [
      fileURLToPath(import.meta.resolve('tsx/cli')),
      'watch',
      'server/index.ts',
      ...process.argv.slice(2),
    ],
    {
      stdio: 'inherit',
      env: { ...process.env, PORT: String(port) },
    },
  )
  const onInterrupt = (): void => {
    watcher.kill('SIGINT')
  }
  const onTerminate = (): void => {
    watcher.kill('SIGTERM')
  }
  process.on('SIGINT', onInterrupt)
  process.on('SIGTERM', onTerminate)
  try {
    process.exitCode = await new Promise<number>((resolve, reject) => {
      watcher.once('error', reject)
      watcher.once('exit', (code, signal) => {
        resolve(code ?? (signal ? 128 + constants.signals[signal] : 1))
      })
    })
  } finally {
    process.off('SIGINT', onInterrupt)
    process.off('SIGTERM', onTerminate)
  }
}

main().catch((error: unknown) => {
  console.error('Не удалось запустить dev-сервер:', error)
  process.exitCode = 1
})

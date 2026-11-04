import type { Server } from 'node:net'
import { networkInterfaces } from 'node:os'

export function listen(server: Server, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error): void => {
      server.off('listening', onListening)
      reject(error)
    }
    const onListening = (): void => {
      server.off('error', onError)
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('Не удалось определить порт сервера'))
        return
      }
      resolve(address.port)
    }
    server.once('error', onError)
    server.once('listening', onListening)
    server.listen(port, '0.0.0.0')
  })
}

export function getServerUrls(port: number): string[] {
  const hosts = new Set(['localhost', '127.0.0.1'])
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === 'IPv4' && !address.internal) {
        hosts.add(address.address)
      }
    }
  }
  return [...hosts].map((host) => `http://${host}:${port}/`)
}

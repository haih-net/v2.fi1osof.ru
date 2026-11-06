// Подготовка одного дополнительного маршрута для TLS-прокси сайта.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    app: { type: 'string' },
    host: { type: 'string' },
    local: { type: 'boolean' },
    entrypoint: { type: 'string' },
    resolver: { type: 'string' },
  },
})
const upstream = values.app
if (upstream && !/^[a-z0-9][a-z0-9-]*-app-1$/.test(upstream)) {
  throw new Error(
    'Укажите полное имя контейнера приложения через --app <проект>-app-1.',
  )
}
const host = values.host ?? (values.local ? 'haih.localhost' : '')
if (!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/.test(host))
  throw new Error('Укажите домен сайта через --host.')
const name = 'cert-' + host.replaceAll('.', '_')
const directory = resolve('storage/client-certificate')
const routes = resolve(directory, 'routes')
mkdirSync(routes, { recursive: true, mode: 0o700 })
const secretPath = resolve(directory, 'proxy-secret')
if (!existsSync(secretPath))
  writeFileSync(secretPath, randomBytes(32).toString('hex'), {
    flag: 'wx',
    mode: 0o600,
  })
const secret = readFileSync(secretPath, 'utf8').trim()
if (!/^[0-9a-f]{64}$/.test(secret))
  throw new Error('Недопустимый секрет прокси.')
const configuration = {
  tls: {
    ...(values.local && {
      certificates: [
        {
          certFile: '/etc/traefik/certs/localhost/server.crt',
          keyFile: '/etc/traefik/certs/localhost/server.key',
        },
      ],
    }),
    options: {
      [name]: {
        minVersion: 'VersionTLS12',
        clientAuth: { clientAuthType: 'RequestClientCert' },
      },
    },
  },
  http: {
    routers: {
      [name]: {
        rule: 'Host(`' + host + '`) && PathPrefix(`/api/client-certificate/`)',
        entryPoints: [values.entrypoint ?? 'websecure'],
        priority: 1000,
        tls: {
          options: name,
          ...(values.resolver && { certResolver: values.resolver }),
        },
        middlewares: [
          name + '-certificateStrip',
          name + '-certificateForward',
          name + '-certificateProxySecret',
        ],
        service: name + '-certificateApp',
      },
    },
    middlewares: {
      [name + '-certificateStrip']: {
        headers: {
          customRequestHeaders: {
            'X-Forwarded-Tls-Client-Cert': '',
            'X-Forwarded-Tls-Client-Cert-Info': '',
            'X-Client-Certificate-Proxy-Secret': '',
          },
        },
      },
      [name + '-certificateForward']: { passTLSClientCert: { pem: true } },
      [name + '-certificateProxySecret']: {
        headers: {
          customRequestHeaders: { 'X-Client-Certificate-Proxy-Secret': secret },
        },
      },
    },
    services: {
      [name + '-certificateApp']: {
        loadBalancer: {
          servers: [
            {
              url:
                'http://' +
                (upstream ?? '{{ env `CLIENT_CERT_APP_CONTAINER` }}') +
                ':3000',
            },
          ],
        },
      },
    },
  },
}
const destination = resolve(routes, 'certificate.yml')
writeFileSync(
  destination + '.tmp',
  JSON.stringify(configuration, null, 2) + '\n',
  { mode: 0o600 },
)
renameSync(destination + '.tmp', destination)
process.stdout.write('Маршрут входа по сертификату подготовлен.\n')

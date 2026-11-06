import { randomBytes, X509Certificate } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
  readFileSync,
  chmodSync,
  copyFileSync,
  symlinkSync,
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

// Только для локального эксперимента. Повторный запуск сохраняет существующие ключи и секреты.
const directory = resolve('storage/client-certificate')
const privateDirectory = resolve('docker/traefik/certs/localhost')
mkdirSync(directory, { recursive: true, mode: 0o700 })
mkdirSync(privateDirectory, { recursive: true, mode: 0o700 })

function writeOnce(path, content) {
  if (!existsSync(path))
    writeFileSync(path, content, { mode: 0o600, flag: 'wx' })
}
let reexportClient = false
const repairClientCertificates = process.argv.includes(
  '--repair-client-certificates',
)
const repairServerCertificate = process.argv.includes(
  '--repair-server-certificate',
)
function certificate(name, subject, extensions) {
  const key = `${privateDirectory}/${name}.key`
  const crt = `${privateDirectory}/${name}.crt`
  if (existsSync(key) || existsSync(crt)) {
    if (!existsSync(key) || !existsSync(crt))
      throw new Error(`Отсутствует сертификат или его ключ: ${name}`)
    if (!new X509Certificate(readFileSync(crt)).ca) return
    if (name === 'server') {
      if (!repairServerCertificate) {
        throw new Error(
          'The local server certificate is a CA. Run with --repair-server-certificate to replace its certificate and private key.',
        )
      }
    } else {
      if (!repairClientCertificates) {
        throw new Error(
          'Клиентский сертификат имеет признак CA:TRUE. Запустите с --repair-client-certificates, чтобы перевыпустить его с прежним ключом.',
        )
      }
      if (!existsSync(`${crt}.ca-backup`)) copyFileSync(crt, `${crt}.ca-backup`)
      execFileSync('openssl', [
        'req',
        '-x509',
        '-key',
        key,
        '-out',
        crt,
        '-days',
        '365',
        '-utf8',
        '-subj',
        subject,
        ...extensions.flatMap((value) => ['-addext', value]),
      ])
      if (name === 'client') reexportClient = true
      return
    }
  }
  const staging = mkdtempSync(resolve(privateDirectory, '.issue-'))
  try {
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-nodes',
        '-keyout',
        resolve(staging, 'key'),
        '-out',
        resolve(staging, 'crt'),
        '-days',
        '365',
        '-utf8',
        '-subj',
        subject,
        ...extensions.flatMap((value) => ['-addext', value]),
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    )
    chmodSync(resolve(staging, 'key'), 0o600)
    renameSync(resolve(staging, 'key'), key)
    renameSync(resolve(staging, 'crt'), crt)
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}
certificate('server', '/CN=haih.localhost', [
  'basicConstraints=critical,CA:FALSE',
  'keyUsage=critical,digitalSignature,keyEncipherment',
  'subjectAltName=DNS:haih.localhost,DNS:localhost,IP:127.0.0.1',
  'extendedKeyUsage=serverAuth',
])
// Штатный dev-маршрут Traefik читает сертификат из этой пары файлов.
for (const extension of ['crt', 'key']) {
  const target = resolve('docker/traefik/certs', `localhost.${extension}`)
  if (!existsSync(target)) symlinkSync(`localhost/server.${extension}`, target)
}
if (repairServerCertificate) process.exit(0)
certificate('client', '/CN=Локальный вход на сайт', [
  'basicConstraints=critical,CA:FALSE',
  'keyUsage=critical,digitalSignature',
  'extendedKeyUsage=clientAuth',
])
certificate('unknown', '/CN=Тестовый неразрешённый ключ', [
  'basicConstraints=critical,CA:FALSE',
  'keyUsage=critical,digitalSignature',
  'extendedKeyUsage=clientAuth',
])
writeOnce(
  `${directory}/authorized-keys.pem`,
  execFileSync('openssl', [
    'x509',
    '-in',
    `${privateDirectory}/client.crt`,
    '-pubkey',
    '-noout',
  ]),
)

writeOnce(`${privateDirectory}/p12-password`, randomBytes(18).toString('hex'))
if (reexportClient || !existsSync(`${privateDirectory}/client.p12`)) {
  if (
    reexportClient &&
    existsSync(`${privateDirectory}/client.p12`) &&
    !existsSync(`${privateDirectory}/client.p12.ca-backup`)
  ) {
    copyFileSync(
      `${privateDirectory}/client.p12`,
      `${privateDirectory}/client.p12.ca-backup`,
    )
    chmodSync(`${privateDirectory}/client.p12.ca-backup`, 0o600)
  }
  execFileSync('openssl', [
    'pkcs12',
    '-export',
    '-inkey',
    `${privateDirectory}/client.key`,
    '-in',
    `${privateDirectory}/client.crt`,
    '-out',
    `${privateDirectory}/client.p12`,
    '-name',
    'Локальный вход на сайт',
    '-passout',
    `file:${privateDirectory}/p12-password`,
  ])
  chmodSync(`${privateDirectory}/client.p12`, 0o600)
}
process.stdout.write(
  'Тестовые сертификаты подготовлены. Разрешённые публичные ключи: storage/client-certificate/authorized-keys.pem\n',
)

import assert from 'node:assert/strict'
import { X509Certificate } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { request as httpsRequest } from 'node:https'
import { request as httpRequest } from 'node:http'

const certs = 'docker/traefik/certs/localhost'
const ca = readFileSync(`${certs}/server.crt`)
const approved = {
  cert: readFileSync(`${certs}/client.crt`),
  key: readFileSync(`${certs}/client.key`),
}
const unknown = {
  cert: readFileSync(`${certs}/unknown.crt`),
  key: readFileSync(`${certs}/unknown.key`),
}
assert.equal(
  new X509Certificate(approved.cert).ca,
  false,
  'Клиентский сертификат не должен быть сертификатом центра сертификации',
)
assert.equal(
  new X509Certificate(unknown.cert).ca,
  false,
  'Клиентский сертификат не должен быть сертификатом центра сертификации',
)
const site = 'https://haih.localhost:8443'
function get(url, identity = {}, headers = {}, method = 'POST') {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const request = parsed.protocol === 'https:' ? httpsRequest : httpRequest
    const req = request(
      parsed,
      {
        ca,
        ...identity,
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        agent: false,
        lookup: (_host, options, callback) =>
          options.all
            ? callback(null, [{ address: '127.0.0.1', family: 4 }])
            : callback(null, '127.0.0.1', 4),
      },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body }),
        )
      },
    )
    req.on('error', reject)
    req.end(method === 'POST' ? '{}' : undefined)
  })
}
const url = site + '/api/client-certificate/signin'
assert.equal((await get(site + '/signin', {}, {}, 'GET')).status, 200)
assert.equal((await get(url)).status, 403)
assert.equal((await get(url, unknown)).status, 403)
const forged = {
  'x-forwarded-tls-client-cert': approved.cert
    .toString()
    .replace(/-----[^-]+-----|\s/g, ''),
  'x-client-certificate-proxy-secret': 'forged',
}
assert.equal((await get(url, {}, forged)).status, 403)
assert.equal((await get(url, unknown, forged)).status, 403)
assert.equal(
  (await get('http://127.0.0.1:3001/api/client-certificate/signin', {}, forged))
    .status,
  403,
)
const response = await get(url, approved)
assert.equal(response.status, 200)
assert.equal(response.headers['set-cookie'], undefined)
assert.match(JSON.parse(response.body).token, /^ey/)
process.stdout.write(
  'Проверены обычный HTTPS, вход по сертификату и отказ для неизвестного ключа и поддельных заголовков.\n',
)

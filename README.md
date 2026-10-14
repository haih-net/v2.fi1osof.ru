# fi1osof.ru — перенос на новый движок

Текущий этап: общий лейаут оригинального сайта и публичные разделы. Запуск без контейнера: `PORT=3111 npm run dev`. PostgreSQL берётся из существующего `.env`, файлы — из настроенного `UPLOADS_DIR`.

- Главная и материалы разрешаются по `KBConcept.uri` и `SiteRoute`; доступны база знаний, проекты, задачи, журнал, таймеры, пользователи и «Обо мне».
- Общие шаблоны React Router получают данные через Apollo → GraphQL → Knex. SSR включён, пререндеринг отключён: новые записи не требуют пересборки сайта.
- Сохранены ru/en/vi с возвратом к исходному тексту при отсутствии перевода, фильтры задач, пагинация и старые `/work-logs` → `/worklogs` (301).
- Используются добавленные владельцем ApolloProvider, Markdown и файловые API. Есть вход и выход без регистрации. История таймеров и индикатор в шапке доступны для чтения.
- Формы редактирования, мутации разделов, управление таймерами, административные действия и чат — следующий этап.
- Метаданные страниц и sitemap формируются динамически для fi1osof.ru. Проверки: `npm run types`, `npm run test:integration`, `npm run e2e` (нужны PostgreSQL и браузеры Playwright).

Проверено на этом этапе: типы, сборка, 61 интеграционный тест, 6 E2E-проверок навигации в десктопном и мобильном Chromium. Старые E2E-тесты статистики ещё требуют адаптации: они ожидают маршруты HAIH и перехватывают все GraphQL-запросы как статистику. Полный E2E-набор пока не проходит.

Ниже сохранена документация исходной заготовки; её демонстрационные страницы HAIH и описание статического рендеринга не описывают текущие публичные маршруты fi1osof.ru.

# HAIH Site

**Build better software with AI — by starting from requirements, not frameworks.**

HAIH Site is a public demonstration of requirement-driven development. Instead of adopting tools first and fitting problems to them, we begin with real needs and choose solutions that earn their place.

## Why This Matters

Most AI-assisted development starts with a technology stack and hopes for the best. HAIH flips this: every solution must justify itself through **purpose**, **capabilities**, **requirements**, and **evidence**.

The website you see is its own proof. Every architectural decision, every dependency, every line of code exists because a real need demanded it — and that need is documented.

## What You Get

- **Transparent decision-making** — See exactly why each technology was chosen
- **Working demonstrations** — Not slides, not promises — running code you can verify
- **Current architecture** — React 19, TypeScript, Vite 8, Docker, Traefik, Varnish
- **Modern delivery** — SPA navigation, build-time rendering, code splitting, HTTP caching

## Tech Stack

| Layer         | Technology                  | Purpose                                   |
| ------------- | --------------------------- | ----------------------------------------- |
| **UI**        | React 19 + TypeScript       | Type-safe components with modern hooks    |
| **Routing**   | React Router 8              | SPA navigation, code splitting, SSR-ready |
| **Build**     | Vite 8                      | Fast HMR, optimized production bundles    |
| **Server**    | Node.js 22 + Express + sirv | Static files, SSR and GraphQL             |
| **Cache**     | Varnish 7                   | Edge caching with explicit policies       |
| **Proxy**     | Traefik 3                   | TLS termination, routing, load balancing  |
| **Container** | Docker Compose              | Reproducible environments                 |

## Quick Start

Use Node.js 22.22.3 (the Docker image is pinned to this version).

```bash
# Development (with hot reload)
npm ci
npm run dev
# → http://127.0.0.1:3000

# Production build
npm run build
npm start
# → http://127.0.0.1:3000
```

## Docker

```bash
cd docker

# Development: app, cache proxy and TLS entry point
docker compose -f compose.yaml -f compose.dev.yaml up -d --build app varnish traefik
# → http://127.0.0.1:8080 (Traefik HTTP)
# → https://haih.localhost:8443 (Traefik HTTPS with HMR)
# → http://127.0.0.1:8088 (Traefik Dashboard)
# → http://127.0.0.1:3001 (App direct, also supports HMR)

# Production
docker compose -f compose.yaml -f compose.prod.yaml up -d
# → http://127.0.0.1:80 (Traefik → Varnish → Node.js)
# → https://127.0.0.1:443
```

### Ports

| Mode        | Service           | Default Port | Variable                 |
| ----------- | ----------------- | ------------ | ------------------------ |
| Local       | Vite/Node.js      | 3000         | `PORT`                   |
| Docker dev  | Traefik HTTP      | 8080         | `SITE_PORT`              |
| Docker dev  | Traefik HTTPS     | 8443         | `SITE_PORT_HTTPS`        |
| Docker dev  | Traefik Dashboard | 8088         | `TRAEFIK_DASHBOARD_PORT` |
| Docker dev  | App direct        | 3001         | `APP_PORT`               |
| Docker prod | Traefik HTTP      | 80           | `SITE_PORT`              |
| Docker prod | Traefik HTTPS     | 443          | `SITE_PORT_HTTPS`        |

Set `NETWORK_NAME` in `docker/.env` to an existing external Docker network. Compose reads that file when run from `docker/`; the app also receives it through `env_file`. The full stack requires the certificates and monitoring configuration/secrets described in the [monitoring runbook](docker/monitoring/README.md).

### Local TLS certificates

Before starting Traefik, place a certificate and key at `docker/traefik/certs/localhost.crt` and `localhost.key`. These files are ignored by Git. For a local self-signed certificate, run from the repository root:

```bash
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout docker/traefik/certs/localhost.key \
  -out docker/traefik/certs/localhost.crt -days 365 \
  -subj '/CN=haih.localhost' \
  -addext 'subjectAltName=DNS:haih.localhost,DNS:localhost,IP:127.0.0.1'
chmod 600 docker/traefik/certs/localhost.key
```

Accept the local certificate in your browser, or use a certificate issued by a locally trusted development CA. `haih.localhost` must resolve to loopback on the browser's machine.

### Development ports and hot reload

The Node HTTP server listens on `PORT` (3000 by default). Vite runs in middleware mode and attaches its WebSocket server to that same listener at `/__vite_hmr`. The browser derives the WebSocket host, port and protocol from the page URL: HTTPS uses `wss://`, HTTP uses `ws://`. No separate HMR port or hardcoded domain is needed.

`APP_PORT` changes only Docker's host HTTP port; keep the container's `PORT=3000` because the port mapping and proxy upstream use it. `SITE_PORT` and `SITE_PORT_HTTPS` set the external proxy ports. For development without Docker, `PORT=3002 npm run dev` serves both HTTP and HMR on port 3002.

The development Compose override selects `traefik/dynamic/development/` and `varnish/development.vcl`. Traefik terminates TLS and sends `/__vite_hmr` directly to the app. Other requests go through Varnish in pass mode, with `X-Cache: PASS` and `Cache-Control: no-store`, so development output is not retained. The production VCL and routes remain separate. To experiment with development caching, explicitly select a different VCL and account for stale modules and HTML.

React edits use HMR where supported. Server edits restart Node through `tsx watch` and can require a refresh. Restart the app after changing port configuration. Published development ports bind to loopback; remote access requires a tunnel or an explicitly configured proxy.

Verified on 2026-10-06 in Chromium against `https://haih.localhost:8443`: TLS HTML delivery through Traefik and Varnish, a successful `wss://haih.localhost:8443/__vite_hmr` connection, and a temporary React edit appearing without a document reload. Restoring the source and refreshing also returned current content. The browser check accepted the self-signed certificate; it does not establish OS/browser certificate trust.

## Architecture Highlights

**Request Flow (Production):**

```
Browser → Traefik → Varnish → Node.js → Static Assets / React Router SSR / API
```

**Request Flow (Docker Development):**

```
Browser → Traefik (TLS) → Varnish (pass) → Node.js + Vite Middleware
Browser → Traefik (WSS /__vite_hmr) → Node.js + Vite WebSocket
```

Public routes listed in `react-router.config.ts` are prerendered during the build. The production Node server serves generated files with sirv and forwards remaining requests to React Router's server build. The current Varnish policy assigns seven days to matching asset extensions and one hour to other successful responses, while `/api` bypasses caching. Publication still needs an explicit cache refresh policy; these settings alone do not establish production readiness.

## Project Structure

```
app/
  pages/             # Page views, sections, data and colocated assets
  routes/            # Route integration and metadata
  components/Layout/ # Shared Header, main content, Footer and basic responsive CSS
  root.tsx           # HTML document, shared layout integration, error boundary
server/
  index.ts           # HTTP server: static delivery, React Router SSR and API (compiled to build/node/)
docker/
  compose.yaml       # Base Docker Compose configuration
  compose.dev.yaml   # Development overrides
  compose.prod.yaml  # Production overrides
  traefik/           # Traefik configuration, certs, logs
    traefik.yml      # Static config (entrypoints, providers)
    dynamic/local/   # Default routing rules
    dynamic/development/ # Development TLS and HMR routing
  varnish/
    default.vcl      # Production cache policy
    development.vcl  # Development pass mode
```

## Development

```bash
npm run dev        # Start Vite dev server
npm run types      # TypeScript validation
npm run build      # Production build
npm run test       # All unit tests (Vitest)
```

## The HAIH Approach

Every solution in this project follows a consistent evaluation model:

1. **Purpose** — What need does it satisfy?
2. **Capabilities** — What does it provide?
3. **Requirements** — What does it demand?
4. **Trade-offs** — Where is the cost justified?
5. **Evidence** — What has been verified?

This isn't methodology theater. It's how we actually build — and how AI assistants can make better recommendations when they understand _why_, not just _what_.

## Status

The site includes an illustrated homepage, Solutions and a blog. The current integration combines prerendering, hydration, SPA navigation, route bundles, request-time SSR and a GraphQL API. See the test commands below for reproducible checks; production cache behavior and development HMR require checks against their actual endpoints.

## License

See repository for license details.

---

**haih.site** — Requirement-driven development, demonstrated.

## Shared page layout

`app/components/Layout` provides the common Header, main landmark and Footer. The root document wraps route content and error fallbacks with this shell, so navigation stays available on 404 and route-error pages. Internal links use React Router, with active navigation and heading focus after forward navigation. A keyboard skip link targets the main content. The footer follows long content and sits at the bottom of short pages.

The shell uses mobile-first Linaria styled components from colocated `styles.ts` modules. Type checking and production builds check different aspects of this integration; browser checks are needed to establish hydration, hot updates and navigation behavior.

## Server monitoring

The [monitoring runbook](docker/monitoring/README.md) describes the production-artifact preview, Grafana dashboard, internal per-site probes, request/application logs and optional email/Telegram alerts. The installation is shared by sites behind one Traefik and uses an explicit site registry. [Verification results](docker/monitoring/verification.md) distinguish the local checks from unverified production behavior. Request filtering is deferred.

## Tests

| Command                          | Scope and prerequisites                                                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                       | All unit tests; no build, Docker or running server required.                                                                                  |
| `npm run test:watch`             | Unit tests in watch mode.                                                                                                                     |
| `npm run test:coverage`          | Unit coverage in the terminal and `coverage/`.                                                                                                |
| `npm run test:integration`       | Builds the site, then checks generated SEO/SSR output, monitoring configuration generation and GraphQL metrics with isolated local listeners. |
| `npm run test:integration:watch` | Watches integration tests; run `npm run build` first and rebuild after changing page/build inputs.                                            |
| `npm run test:integration:stack` | HTTP/cache and monitoring checks against an already running production preview stack.                                                         |
| `npm run e2e`                    | Playwright: Chromium, WebKit and mobile Chromium; builds and starts the production Node server automatically.                                 |
| `npm run e2e:webkit`             | Only the WebKit browser project.                                                                                                              |
| `npm run e2e:report`             | Opens the last Playwright HTML report.                                                                                                        |

Install browser binaries once with `npx playwright install chromium webkit` (Linux hosts may also need `npx playwright install-deps chromium webkit`). Playwright owns port 4317 and fails if it is already occupied. To test an existing server or the real proxy/cache path, supply `PLAYWRIGHT_BASE_URL`; in that mode it does not build or start a server:

```bash
PLAYWRIGHT_BASE_URL=http://haih.localhost npm run e2e
TEST_URL=http://haih.localhost MONITORING_TEST_URL=http://127.0.0.1:18080 GRAFANA_TEST_URL=http://127.0.0.1:13000 npm run test:integration:stack
```

Stack tests require the [monitoring preview](docker/monitoring/README.md), its provisioned Grafana password file, and a `TEST_URL` routed through Traefik and Varnish. They are kept separate from local integration tests because they require external infrastructure. The suite fails when that infrastructure is unavailable; it does not silently skip checks. Failure injection and notification fixtures remain explicit `test:monitoring:failure` and `test:monitoring:notifications` commands and are never part of automatic test discovery.

Add unit tests under `tests/unit/`, or colocate `*.test.ts` / `*.test.tsx` in `app/` (`*.test.ts` in `server/`). Put local integration tests in `tests/integration/`, stack checks in `tests/stack/`, and browser `*.spec.ts` files in `tests/e2e/`. Each runner discovers its own suite. Unit tests currently use the Node environment; browser behavior belongs in Playwright. Configurations use CommonJS exports to avoid adding default exports. Coverage measures the configured SEO and server source scope; it is unit coverage, not combined integration/browser coverage.

Playwright checks hydration errors, same-document navigation, heading focus, metadata updates, browser history, deep-link refresh and 404 responses. Its default local server run does not prove Traefik/Varnish cache behavior or development HMR.

## Пользователи и авторизация fi1osof.ru — Knex

Сервер читает локальный `.env` из корня проекта. Образец — `server/env.example`.
Переменные окружения процесса имеют приоритет. Для подключения можно задать
`DATABASE_URL` либо `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`.
Текущая локальная база: `fi1osof-ru--agent` на `127.0.0.1:5432`.
Приложение использует существующие таблицы PostgreSQL: схему не создаёт и не меняет.

Запуск вне Docker: `npm run dev`. Порт берётся из `PORT` (локально `3111`),
GraphQL доступен по `http://localhost:3111/api`. Из корня проекта можно
переопределить порт: `PORT=3112 npm run dev`.

Перенесены `user`, `users`, `usersCount`, `me`, `signin`, `updateCurrentUser`,
`updateUser`. Сохранены имена аргументов оригинальной схемы, фильтры, сортировка
по `createdAt` по убыванию и пагинация `skip`/`take` (неотрицательные значения).
Email, EthAccount, TelegramAccount и Balance доступны только владельцу записи.
Редактировать чужой статус или пароль может только sudo; свой профиль меняется
через `updateCurrentUser`. При изменении пароля используется bcrypt с cost 10,
при изменении content проверяется синтаксис MDX. Заполнение связанных аккаунтов,
операции баланса и его Transactions на этом этапе не переносились.

Авторизация: `Authorization: Bearer <token>`. Сохранён формат JWT
`{userId, type: "Auth", tokenId}` и таблица Token. Для совместимости с прежними
JWT нужен прежний `JWT_SECRET` и соответствующие записи Token в этой базе.
Секрет находится только в игнорируемом `.env`. Проверяются подпись HS256, тип,
владелец и наличие записи токена, JWT exp и Token.expiredAt. Удаление записи
Token отзывает доступ. Как в оригинале, новые токены входа не имеют срока
действия; статус blocked сам по себе не запрещает вход. Правила списков тоже
сохранены: по умолчанию активные пользователи и собственная запись; sudo видит
все статусы, явный фильтр status применяется для любого посетителя.

Регистрация и создание реферальных токенов не добавлены. Существующие ошибки
входа сохранены. Контейнер приложения и настройки Compose не изменялись.

Проверки: `npm run types`, `npm run test:integration` (включает сборку).
Только проверки пользователей: `npx vitest run -c vitest.integration.config.cjs
 tests/integration/users.test.ts` — выполнить одной строкой. Нужны доступ к
локальной базе и JWT_SECRET. Тесты создают собственные записи внутри транзакций
и откатывают их после каждого теста; существующих пользователей не меняют.

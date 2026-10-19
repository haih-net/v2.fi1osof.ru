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

## Static files in shared

`shared/` is an untracked directory for static files (only `.gitkeep` is tracked).
Do not place components, validation schemas, or other application source code there.
Keep client code beside its owning component in `app/` and server code beside its
owning entity in `server/`.

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

React Router's root middleware creates a request context for each HTTP request.
Loaders obtain Apollo through `getRequestApollo(context)`: the first call creates
the client, and subsequent calls reuse it, including concurrent loaders. Server
rendering uses the same client through `RequestApolloContext`. Middleware stops
the client when request handling finishes, including errors and redirects;
clients and authorization headers are never shared between HTTP requests.

The root loader exposes one `initialApolloState` getter, evaluated when completed
loader data is rendered or serialized, so it includes the results of parallel
loaders. Page loaders return their page properties without separate cache
snapshots. The browser merges the root snapshot into its persistent Apollo cache
on hydration and SPA navigation. Context creation and cache inspection alone do
not instantiate Apollo; the first loader or rendering consumer requesting the
client does. Run `npx vitest run app/request/context.test.ts` to check lifecycle,
request isolation, SSR reuse and SPA data serialization.

## License

See repository for license details.

---

**haih.site** — Requirement-driven development, demonstrated.

## Shared page layout

`app/components/Layout` provides the common Header, main landmark and Footer. The root document wraps route content and error fallbacks with this shell, so navigation stays available on 404 and route-error pages. Internal links use React Router, with active navigation and heading focus after forward navigation. A keyboard skip link targets the main content. The footer follows long content and sits at the bottom of short pages.

The shell uses mobile-first Linaria styled components from colocated `styles.ts` modules. Type checking and production builds check different aspects of this integration; browser checks are needed to establish hydration, hot updates and navigation behavior.

## Server monitoring

The [monitoring runbook](docker/monitoring/README.md) describes the production-artifact preview, Grafana dashboard, internal per-site probes, request/application logs and optional email/Telegram alerts. The installation is shared by sites behind one Traefik and uses an explicit site registry. [Verification results](docker/monitoring/verification.md) distinguish the local checks from unverified production behavior. Request filtering is deferred.

## Wallet sign-in

`/signin` supports passwords and MetaMask. Wallet authentication uses
`ethAccountNonce` and `authEthAccount`, the existing `User`, `EthAccount` and
`Token` tables, and the server's `JWT_SECRET`. Signatures are checked with
[ethers verifyMessage](https://docs.ethers.org/v6/api/hashing/#verifyMessage).
Challenges expire after five minutes and are consumed transactionally on use.
No blockchain transaction or RPC service is required.

The registration policy matches the old site: an existing linked wallet can
sign in regardless of `NEXT_PUBLIC_SITE_SIGNUP_STRATEGY`. A new wallet requires
a valid stored `Referrer` JWT unless that variable is exactly `ANY`. Invalid,
revoked or expired invitations are rejected even in `ANY` mode. Invitation links
use `/signin?referrerToken=...`; no separate registration page is enabled.
The server reads the policy at runtime. An authenticated user can link a new
wallet, but cannot take a wallet from another account.

The auth tests use an isolated in-memory SQLite database and need no external service:

```bash
npx vitest run server/schema/types/EthAccount/auth.test.ts
npx vitest run app/Custom/components/Auth/MetaMaskAuth/index.test.tsx
npx playwright test tests/e2e/signin.spec.ts --project=chromium --project=mobile-chromium
```

Browser tests simulate the injected wallet and GraphQL responses. They verify
session refresh, bearer headers, redirect and mobile layout; they do not replace
a manual check with the real MetaMask extension.

## Tests

| Command                          | Scope and prerequisites                                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test`                       | All unit tests; no build, Docker or running server required.                                                                                                       |
| `npm run test:watch`             | Unit tests in watch mode.                                                                                                                                          |
| `npm run test:coverage`          | Unit coverage in the terminal and `coverage/`.                                                                                                                     |
| `npm run test:integration`       | Builds the site, then checks generated SEO/SSR output, monitoring configuration generation, statistics delivery and GraphQL metrics with isolated local listeners. |
| `npm run test:integration:watch` | Watches integration tests; run `npm run build` first and rebuild after changing page/build inputs.                                                                 |
| `npm run test:integration:stack` | HTTP/cache and monitoring checks against an already running production preview stack.                                                                              |
| `npm run e2e`                    | Playwright: Chromium, WebKit and mobile Chromium; builds and starts the production Node server automatically.                                                      |
| `npm run e2e:webkit`             | Only the WebKit browser project.                                                                                                                                   |
| `npm run e2e:report`             | Opens the last Playwright HTML report.                                                                                                                             |

Install browser binaries once with `npx playwright install chromium webkit` (Linux hosts may also need `npx playwright install-deps chromium webkit`). Playwright owns port 4317 and fails if it is already occupied. To test an existing server or the real proxy/cache path, supply `PLAYWRIGHT_BASE_URL`; in that mode it does not build or start a server:

```bash
PLAYWRIGHT_BASE_URL=http://haih.localhost npm run e2e
TEST_URL=http://haih.localhost MONITORING_TEST_URL=http://127.0.0.1:18080 GRAFANA_TEST_URL=http://127.0.0.1:13000 npm run test:integration:stack
```

Stack tests require the [monitoring preview](docker/monitoring/README.md), its provisioned Grafana password file, and a `TEST_URL` routed through Traefik and Varnish. They are kept separate from local integration tests because they require external infrastructure. The suite fails when that infrastructure is unavailable; it does not silently skip checks. Failure injection and notification fixtures remain explicit `test:monitoring:failure` and `test:monitoring:notifications` commands and are never part of automatic test discovery.

Add unit tests under `tests/unit/`, or colocate `*.test.ts` / `*.test.tsx` in `app/` (`*.test.ts` in `server/`). Put local integration tests in `tests/integration/`, stack checks in `tests/stack/`, and browser `*.spec.ts` files in `tests/e2e/`. Each runner discovers its own suite. The default test environment is Node; individual component tests can opt into jsdom. Browser scenarios run in Playwright. Configuration entry points use CommonJS exports, while the shared factory uses a named ESM export. Coverage measures the configured SEO and server source scope; it is unit coverage, not combined integration/browser coverage.

### Shared Vitest configuration

All three Vitest entry points call `createTestConfig` from `vitest.shared.mjs`.
The factory loads `vite.config.ts` once per configuration and merges its aliases,
plugins and compile-time definitions with the suite's test settings. Keep shared
Vite resolution settings, including the `app` and `server` aliases, in
`vite.config.ts`; TypeScript `paths` alone do not configure Vitest resolution.
The React Router build plugin is disabled during Vitest runs by the existing
`VITEST` guard in the Vite configuration.

The factory owns the Node environment, in-memory SQLite default, mock restoration
and default five-second test/hook timeouts. Entry points contain only suite-specific
settings:

- `vitest.config.cjs`: unit and colocated tests, plus coverage settings.
- `vitest.integration.config.cjs`: local integration tests, with 15-second timeouts.
- `vitest.stack.config.cjs`: infrastructure tests, with 90-second timeouts.

Each entry point supplies its own complete `test.include` list. Suites do not
inherit one another's discovery patterns or coverage settings. Add common runner
settings to the factory instead of duplicating them in the entry points.

To rerun local integration tests against an existing build:

```bash
npx vitest run -c vitest.integration.config.cjs
```

Rebuild first when application or build inputs change. Loading the stack
configuration does not verify that the external preview infrastructure works.
Paid search-provider checks remain separate: `npm run test:search:live` requires
provider credentials and is not included in any of these Vitest suites.

Playwright covers sign-in, chat administration, 404 responses and statistics
collection/delivery, including SPA navigation and browser history. Tests use
neutral fixtures or the current configuration rather than fixed site domains,
branding, article titles or commit IDs. The default local server run does not
prove Traefik/Varnish cache behavior or development HMR.

## Shared model client

`server/llm/client.ts` exports a single `llmClient` for chat, web search and image generation. `complete({ model, messages, ... }, signal)` accepts the model and parameters for each request; the client does not retain history, the selected model or an AbortController between requests. It returns the original Response, preserving the stream, HTTP status, headers and error body for the calling code's existing diagnostics.

All requests use the server-side `CHAT_API_BASE_URL` and `CHAT_API_KEY`. The URL is required: there is no implicit fallback to another provider. `CHAT_MODEL` specifies the chat model; `CHAT_WEB_SEARCH_MODEL` allows a different search model to be selected, falling back to the chat model when empty. `CHAT_WEB_SEARCH_TOOL` defaults to `openrouter:web_search` with `engine: native` when unset or empty. For Polza, set `CHAT_API_BASE_URL=https://polza.ai/api/v1`, use a Polza API key and set `CHAT_WEB_SEARCH_TOOL=polza:web_search`; this tool uses Polza search engines, so the client omits `engine: native`. See the [OpenRouter](https://openrouter.ai/docs/guides/features/server-tools/web-search) and [Polza](https://polza.ai/docs/gaidy/server-tools) tool documentation. Native search capabilities depend on the model and endpoint; OpenRouter may fall back to another engine for unsupported models. Image generation passes its own model from the incoming GraphQL request and uses the same URL and key; the former OPENROUTER_API_URL and OPENROUTER_API_KEY are no longer used. The legacy GraphQL provider name OPENROUTER is retained for client compatibility and does not determine the API URL.

## Local database

The server uses SQLite through Knex and better-sqlite3. The optional
`DATABASE_FILENAME` environment variable selects the SQLite file path. When unset
or an empty string, it defaults to `server/database/data/database.sqlite`. Relative
paths resolve from the working directory. The schema initializes on first use.
Docker Compose passes `/app/server/database/data/database.sqlite` by default;
set `DATABASE_FILENAME` in `docker/.env` to override it. Tests use `:memory:`. `DATABASE_URL` is no longer used. Data and SQLite journal files are
excluded from Git and Docker build contexts. Docker Compose mounts the data
directory so it survives container replacement; it must be writable by the
container user (UID 1000 in the production image).

Connections enable WAL, foreign keys and a five-second busy timeout. Dates are
stored as Unix milliseconds and returned as JavaScript Dates; boolean fields
are restored on reads. Schema version 2 includes the user, token, wallet,
Telegram account, balance, file, concept, route and chat tables used by the resolvers.
Existing version 1 databases are upgraded automatically without replacing their records.
Existing PostgreSQL data is not imported. Back up the database with SQLite's
backup API, or stop the server before copying the entire data directory.

### First administrator

Run from the project directory:

```bash
ADMIN_PASSWORD='your-password' npm run user:create-admin -- --username admin --email admin@example.com
```

Alternatively, use `--password-stdin` to read the password from standard input.
The script creates an active user with `sudo = true` and a bcrypt password hash.
It initializes a new database if necessary. If **any user** already exists,
it exits with code 1 without adding or changing users. The emptiness check and
insert run in one immediate SQLite transaction, including for concurrent CLI runs.
`--database <path>` overrides the database file for isolated environments;
`--help` lists the options. The script uses Node.js 22.22.3+ and is also included
in the production image (`npm run user:create-admin -- --username admin`).

### Chat persistence

Chat dialogues, messages (including tool logs, errors, token usage and page URLs),
and the signing key now use the same SQLite database. The REST and GraphQL APIs
and guest token format are unchanged. Each appended message and its index data
are stored in a single row; history is read in insertion order. Tool messages
remain visible only in administrator history and are excluded from the message index.
Unknown success status and missing usage counters remain distinct from false and zero.

## Server-side feedback form

The `submitFeedback(data: { token, contacts, message })` mutation is defined in `server/schema/types/ChatMessage/resolvers/submitFeedback.ts`. Message processing and SMTP delivery are implemented in `server/schema/types/ChatMessage/helpers/feedback.ts`, without app dependencies. Contacts are accepted as free text. The client requests a dialogue token immediately before submission, after a five-second delay from opening the form.

Email uses the shared `MAIL_FROM`, `MAIL_TO`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_REQUIRE_TLS` settings from `docker/.env.example`. If `MAIL_TO` is not set, notifications go to `MAIL_FROM`. The shared `sendEmail` function in `ChatMessage/helpers/sendEmail.ts` accepts the recipient, subject, and text. Without `SMTP_HOST`, it uses the recipient's MX records. Disable required TLS for local MailHog. The `FEEDBACK_*` variables are no longer needed. The site address comes from Origin, falling back to the request protocol and Host, and is used only in the notification text.

Form success means the message was saved in the dialogue. Email notification starts after saving and does not delay the visitor's response. Missing email configuration and SMTP errors are logged on the server but do not turn an accepted submission into a failure. Delivery has no queue or automatic retries; stopping the process can interrupt it, while the saved dialogue remains available in the admin panel. Retrying with the same token creates neither another message nor another notification, including after a process restart.

Tokens are signed with the chat key; dialogues are stored in SQLite. Rate limits are kept in process memory and apply to the connection address. Behind a proxy, visitors may share these limits: the service does not trust arbitrary X-Forwarded-For values.

### Feedback dialogues

The existing `AppContext` controls opening the form through `isFeedbackOpen`, `openFeedback`, and `closeFeedback`. `FeedbackForm` is rendered in Layout; fields, timing, and submission remain inside the form. On opening, `useEffect` records the opening time in component state. Before five seconds have elapsed, submission shows an alert with the remaining time without calling the API. After five seconds, the form obtains `createChatToken(data: { channel: feedback })` and immediately calls `submitFeedback`. Retries within the same open form reuse the token. This is a simple client-side delay; the server still validates the token signature, channel, and submission rate.

A dialogue has a `chat` or `feedback` channel, exposed in the API and admin card. SQLite migration version 3 assigns `chat` to existing dialogues while preserving history. The form message and contacts are saved as a `user` message without an agent reply before email delivery. SMTP failure does not delete the message; retries with the same token do not duplicate it. Dialogue tokens do not expire, matching existing chat tokens. The separate `prepareFeedback` mutation is no longer used.

## Error propagation contract

At every server stage, failures must have readable, actionable messages. Raise failures with `throw new Error(message)` and preserve the original error message across HTTP, streaming, and GraphQL boundaries. GraphQL must expose it in `errors[].message`; do not replace an available server explanation with a generic HTTP status or an unspecified internal error. Keep existing diagnostic logs and error causes.

Domain validation belongs to the service that owns the operation. The GraphQL chat proxy forwards inputs accepted by the GraphQL schema without adding token or message validation. `/api/chat` validates the required token regardless of the caller and distinguishes a missing or blank token from an invalid token. The browser obtains a token automatically through `createChatToken` before sending its first message; GraphQL callers must obtain and supply it themselves. A required GraphQL `String!` rejects omitted or null values but permits an empty string, which the chat service must reject.

The proxy must preserve errors returned before streaming as well as errors carried inside the stream. Interrupted streams must fail instead of returning a successful partial response. Use a transport-specific fallback only when no readable server message is available. Tests must verify the messages received by callers, including missing, blank, and invalid chat tokens and HTTP/stream failures.

README documentation must be written in English.

Transport errors raised before the chat returns an HTTP response (such as invalid header characters or a connection failure) are logged in full on the server. The GraphQL caller receives a readable general request error instead of low-level fetch details. Keep the chat token in the Authorization header, not in the JSON request body. Errors returned by the chat itself retain their original messages.

### User pages

`/users` and `/users/:userId` use React Router loaders, Apollo operations from
`app/gql/src`, and colocated Linaria styles. The `/signup` page supports password registration with the configured invitation
policy and `USER_DEFAULT_STATUS` (default `active`). Profiles support editing, avatars,
Markdown, administrator status changes and invitations. Invitations use
`REFERRER_TOKEN_TTL` (default `1h`) and the existing `JWT_SECRET`.

SQLite schema version 4 adds the transaction ledger, unique blockchain payment
records, and a Telegram account identifier. Existing users and balances are
preserved. The migration runs when the database opens.

Optional integrations retain the original environment names:

- `NEXT_PUBLIC_CRYPTO_ENABLED=true` exposes balances, transfers and top-ups.
- `CRYPTO_CHAIN_ID`, `CRYPTO_RPC_URL`, `CRYPTO_USDT_CONTRACT_ADDRESS` and
  `PAYMENT_RECIPIENT_ADDRESS` configure USDT payments (six token decimals).
  The wallet switches to the chain returned by the server. Credits require two
  confirmations, the configured token and recipient, and the linked sender.
- `NEXT_PUBLIC_TELEGRAM_BOT_NAME` exposes the Telegram login widget;
  `TELEGRAM_BOT_TOKEN` stays on the server and verifies its signed payload.
  The bot's login domain must be configured in Telegram.

Public flags are embedded during the Vite build; rebuild after changing them.
Pending top-up details are retained in the browser so verification can be retried
without sending another payment. These integrations require configured services;
local tests do not establish successful live wallet or Telegram login behavior.

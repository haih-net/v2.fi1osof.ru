# Чат

Страница `/ai` выводит `ChatContent`; остальные страницы показывают плавающий виджет. Общий `ChatProvider` сохраняет диалог при переходах внутри сайта. После перезагрузки отображаемая переписка очищается, но серверный контекст сохраняется и используется при следующем сообщении с тем же токеном.

Перед первым сообщением браузер получает подписанный токен через мутацию `createChatToken` существующего GraphQL API (`POST /api`) и сохраняет его в `localStorage` (`chat_access_token`). Следующие запросы используют этот токен. В `POST /api/chat` передаются только `{ message }` и заголовок `Authorization: Bearer <token>`. Без корректной подписи сервер отвечает 401; браузер удаляет отвергнутый токен, следующая отправка создаёт новый чат. Express обращается к API, совместимому с Chat Completions, и передаёт текст через SSE. n8n не используется. Отмена в браузере отменяет запрос к провайдеру. Оборванный поток без `[DONE]` считается ошибкой.

Сервер читает настройки из окружения или корневого `.env`:

- `CHAT_API_BASE_URL` — базовый URL API, по умолчанию `https://openrouter.ai/api/v1`. Сервер добавляет `/chat/completions`.
- `CHAT_API_KEY` — ключ провайдера, только на сервере.
- `CHAT_MODEL` — идентификатор модели. В текущей настройке используется `google/gemini-3.1-flash-lite-preview`.
- `CHAT_SYSTEM_PROMPT` — необязательная замена системной инструкции.

Docker Compose использует `docker/.env`; образцы настроек находятся в `docker/.env.example`. После изменения окружения сервер необходимо перезапустить. Значения без префикса `VITE_` не передаются в браузер.

Сервер принимает новое сообщение длиной до 16000 символов. Контекст формируется из сохранённых завершённых пар вопрос–ответ: до 39 сообщений вместе с новым вопросом и до 64000 символов. Полная история остаётся в файле. Одновременно выполняется до 8 запросов на процесс, таймаут — 120 секунд. Это ограничение нагрузки, а не пользовательская квота. История сохраняется в `storage/chats/<id>/messages.json`, ключ HMAC-SHA256 — в `storage/chats/.signing-key`. База данных не используется. Ключ создаётся автоматически; сохраняйте его вместе с каталогами чатов при переносе и резервном копировании. Токены не имеют срока истечения; смена ключа отзывает все токены. The model can read the public GraphQL API using `graphql_request`; booking and other mutations are not supported.

Запись истории атомарная и выполняется перед отправкой `[DONE]`. Оборванные и неуспешные ответы не добавляются в контекст. На один чат допускается один активный запрос (409 при повторной отправке); блокировка рассчитана на один серверный процесс. Каталог `storage` не публикуется статическим сервером и запрещён для файловой раздачи Vite. Выдача гостевого токена публичная: подпись изолирует чаты, но сама по себе не является защитой от ботов.

События отправки, ответа и ошибки передаются существующей очередью статистики, включая тексты вопросов и ответов. Настройки интеграции статистики остаются прежними.

Прокси должен пропускать `/api/chat` без кеширования и буферизации. В конфигурации проекта Varnish пропускает `/api`, а Traefik исключает `text/event-stream` из сжатия. TLS завершается на внешнем прокси.

Проверки: `npm run types`, `npm run build`, `npm test -- app/Custom/components/Chat server/chat server/statistics.chat.test.ts`.

## Журнал сообщений и администрирование

Новые сообщения содержат `id` и `createdAt` (ISO 8601, UTC). Вопрос получает UUID сервера и сохраняется до запроса к провайдеру; поэтому не теряется при ошибке генерации. Завершённый ответ сохраняет ID из потока провайдера, если он подходит для журнала, иначе получает UUID. Время ответа фиксируется сервером при начале чтения потока. В запрос модели передаются только роль и текст, без служебных метаданных.

Общий индекс `storage/chats/messages.csv` дописывается через `appendFile` в режиме `a`, без перезаписи предыдущих строк. Формат строки без заголовка: `createdAt,chatId,id,role`. Полный текст остаётся в `messages.json` соответствующего диалога. Поля индекса ограничены безопасными для CSV символами. Старые истории не переписываются и не индексируются задним числом; при чтении диалога отсутствующие ID и время возвращаются как `null`.

Страница `/admin/chat/messages` показывает журнал только при `currentUser.sudo === true`. Запрос `chatMessages` отдаёт весь индекс; браузер разбивает его на страницы по 20 строк, от новых записей к старым. Для каждой видимой строки отдельный запрос `chatMessage(chatId, messageId)` получает текст с сервера. Оба запроса повторно проверяют sudo на сервере.

`chatDialogue(chatId, token)` возвращает полную историю. Sudo-пользователь может читать любой диалог. Для остальных сервер проверяет подпись токена и совпадение его ID с запрошенным диалогом. Токен можно передать аргументом `token` или заголовком `Authorization: Bearer <chat token>`.

Индекс и история записываются последовательно, а не одной файловой транзакцией. При аварии между записью истории и дописыванием CSV сообщение может остаться в диалоге без строки индекса. Ограничение одного активного запроса на диалог остаётся локальным для серверного процесса.

## GraphQL tool

`graphql_request` accepts `query`, optional `variables` and `operationName`, and mandatory non-empty `reasoning`. The server displays that brief purpose before execution. Requests go to the current server's `/api` without authorization or cookies; the API enforces its usual anonymous access rules. Introspection allows the model to discover available fields. Public site content is exposed through `concepts` and `concept`; recommendations must be grounded in the returned data.

Streaming tool calls are assembled before execution. Results and GraphQL errors return to the model for continuation. A turn allows up to eight tool rounds (eight calls each), followed by a final answer; the existing 120-second timeout covers the whole turn. Queries are read-only, arguments are limited to 64000 characters, and results to 128000 characters.

Tool calls (including reasoning and arguments) and results/errors are saved as `tool_call` and `tool` entries in the dialogue's `messages.json`. They are excluded from `messages.csv` and from subsequent model history. The admin dialogue displays these entries; the token owner's history contains only user/assistant messages. The visible purpose remains part of the assistant answer. Existing logs and messages are preserved.

## Message outcomes

Valid messages with a verified chat token are saved before configuration checks, capacity checks, or provider requests. Each new message has `success`; assistant responses also have `replyToId`. HTTP/provider errors, interrupted streams, timeouts and client disconnects produce an assistant entry with `success: false`, its own ID (the generation ID when received, otherwise a UUID), timestamp, provider request ID/status, error details and any partial answer. Failed answers are excluded from model context. Saving still requires a writable chat store; storage failures remain in the existing server diagnostics.

The CSV index has five columns: `createdAt,chatId,id,role,status`, with status `success`, `error` or `unknown`. Existing four-column rows are read as `unknown` without rewriting history. Both admin views show the outcome, and the dialogue links answers to their incoming message IDs. Tool records remain excluded from CSV. Appends to each dialogue are serialized within the server process so a concurrent rejected request cannot overwrite another message.

## Bathhouse cards

The assistant renders catalogue results with `<company id="ACTUAL_CONCEPT_ID">Company name</company>`. The ID must come from the API and identify a `company:*` concept. Non-empty children and the closing tag are mandatory; place each card in its own Markdown block, outside code fences and links. The name remains visible while loading or when the concept is unavailable. Missing IDs or children do not trigger a lookup.

Markdown fetches the concept by ID with `detailedInfo: false` and renders `CompanyConceptItem` with `variant="short"`. Shared `ConceptItem` dispatches full concept pages to city/company renderers, keeping the existing generic page fallback. The shared `CompanyCard` keeps its normal catalogue appearance and adds a compact chat layout.

## Tools and skills

Each tool owns its definition, argument validation and execution in `server/chat/tools/`: `graphqlRequest.ts` reads the public API, and `readSkill.ts` returns a registered skill. `registry.ts` exposes the definitions and checks mandatory reasoning for every tool. Stream assembly lives in `toolCalls.ts`, shared contracts in `types.ts`, and system message composition in `systemMessage.ts`.

Skills live in separate TypeScript modules under `server/chat/skills/`, with `id`, a short `description`, and full `content` in template literals. The system prompt includes only the summary list. The agent loads `catalogue-search` and `bathhouse-cards` through `read_skill` before applying them. The tool reads only registered IDs, never arbitrary filesystem paths. Skill calls use the same explanation, error handling and dialogue logging as GraphQL and remain excluded from `messages.csv`. To add a skill, create a module and register it in `skills/registry.ts`; to add a tool, register its module in `tools/registry.ts`.

## Page context and company actions

Every message sends the URL captured at submission in the `X-Chat-Page-Url` header, including query parameters and the fragment. This applies to the widget and `/ai`, including client-side navigation. The server validates HTTP(S) URLs, stores `pageUrl` with the incoming message and includes the current URL as untrusted context in the system message.

`get_current_page` resolves the URL pathname through `concept(where: {uri})` using the local anonymous API. It never fetches the supplied hostname. Query parameters and fragments remain available to the model but are excluded from concept lookup. A static page or inaccessible concept can return null; absent/invalid URL produces a tool error. Explicit company IDs in the user's message take precedence over the page context.

Full company pages and catalogue/chat cards offer «Оставить отзыв», «Что говорят?» and «Это моя компания». Each button opens the chat and fills a draft with only the natural-language action; the visitor sends it. Company names, IDs and URLs are not appended to the message. The agent resolves the current page from the request header. The `company-reviews` skill guides feedback collection and explains that the administration will read and consider it, without claiming public publication or a separate review write.

## Internet reviews

`web_search` sends an isolated request through the shared `llmClient`, using `CHAT_API_BASE_URL`, `CHAT_API_KEY` and `CHAT_WEB_SEARCH_MODEL` (or `CHAT_MODEL` when unset). An unset or empty `CHAT_WEB_SEARCH_TOOL` selects `openrouter:web_search` with `engine: native`. For Polza, set its API URL and key and explicitly select `polza:web_search`; the native engine parameter is omitted because Polza uses its own search engines. Native support and domain filtering depend on the model and endpoint; this client does not pin provider routing. Arguments are `query`, mandatory `reasoning`, optional `max_uses` (1–5, default 3), and optional `allowed_domains` (up to 10 plain domain names). The existing turn timeout and cancellation signal cover this request too.

The result retains the answer, citation annotations, provider IDs, usage and search timestamp. HTTP/provider failures return an error result with status and request ID, so normal tool logging marks them unsuccessful. Like other tools, calls/results appear only in the dialogue history, not the CSV index. The reviews skill requires both local API and internet checks, source links, and an explicit distinction between unavailable reviews and a failed search. Server-tool API reference: https://openrouter.ai/docs/guides/features/server-tools/web-search

Run request-contract tests with `npx vitest run server/chat/tools/webSearch.test.ts`.
Run the paid live checks separately with `npm run test:search:live`, supplying
`OPENROUTER_API_KEY` and `POLZA_API_KEY` in the process environment. Both checks
use `anthropic/claude-haiku-4.5`, request one search restricted to `nodejs.org`,
and require a nonempty answer, citation annotations and a positive search usage
counter. Missing credentials or provider failures fail the checks. These tests
are excluded from ordinary unit/integration discovery and never store keys.

Verified on 2026-10-17 with `anthropic/claude-haiku-4.5`: both live checks
passed with one reported search each (OpenRouter: five citations; Polza: one).
The check accepts `usage.server_tool_use.web_search_requests` or
`usage.server_tool_use_details.web_search_requests`; OpenRouter returned the
latter. This verifies search execution, not which upstream search engine ran.

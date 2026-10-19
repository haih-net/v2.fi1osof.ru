# Website mail delivery

The website uses `server/schema/types/ChatMessage/helpers/sendEmail.ts`.
Select any SMTP server through `docker/.env`; no application code change is
needed to switch between this mailserver and an external SMTP provider.
`MAIL_*` server settings configure Docker Mailserver, while `SMTP_*` settings
configure the application's connection to it.

## Local startup: website → mailserver → MailHog

Run all Compose commands below from `docker/`. They use both the base and dev
files; `compose.yaml` alone does not enable the development relay.

Set these values in `docker/.env`, preserving the other application settings:

```dotenv
MAIL_FROM=website@example.test
MAIL_TO=feedback@example.net
SMTP_HOST=mailserver
SMTP_PORT=25
SMTP_USER=
SMTP_PASSWORD=
SMTP_REQUIRE_TLS=false
MAIL_HOSTNAME=mail.localhost
MAIL_DOMAIN=localhost
MAIL_RELAY_HOST=[mailhog]:1025
MAIL_SMTP_ONLY=1
MAIL_ENABLE_IMAP=0
MAIL_SSL_TYPE=
MAIL_PERMIT_DOCKER=connected-networks
```

The dev Compose file defaults to SMTP-only mode and relay `[mailhog]:1025`.
Use an external recipient domain such as `example.net` in this test: delivery
to a local mailserver domain can take the local mailbox route instead of the relay.
No email account, DNS record, certificate or DKIM key is required for this local
SMTP-only check. Do not copy `postfix-main.cf.sample`: `PERMIT_DOCKER` already
trusts the connected Docker network, and the sample trusts much broader networks.

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d mailhog mailserver
docker compose -f compose.yaml -f compose.dev.yaml up -d --build app
# Optional public entry point through the project's existing proxy configuration:
docker compose -f compose.yaml -f compose.dev.yaml up -d traefik
```

The existing external network selected by `NETWORK_NAME` must exist for `app`.
The direct website URL is <http://localhost:3001> (`APP_PORT` can override it).
MailHog's inbox is <http://localhost:8025> (`MAILHOG_HTTP_PORT` can override it).
After changing application environment values, recreate `app` with `up -d app`.

Development ports bind to `127.0.0.1`:

| Service               | Host port | Container port | Environment override   |
| --------------------- | --------- | -------------- | ---------------------- |
| Mailserver SMTP       | 1026      | 25             | `MAIL_SMTP_PORT`       |
| Mailserver SMTPS      | 1465      | 465            | `MAIL_SMTPS_PORT`      |
| Mailserver submission | 1587      | 587            | `MAIL_SUBMISSION_PORT` |
| Mailserver IMAP       | 1143      | 143            | `MAIL_IMAP_PORT`       |
| Mailserver IMAPS      | 1993      | 993            | `MAIL_IMAPS_PORT`      |
| MailHog SMTP          | 1025      | 1025           | `MAILHOG_SMTP_PORT`    |
| MailHog HTTP          | 8025      | 8025           | `MAILHOG_HTTP_PORT`    |

A port mapping does not enable its service. This local configuration uses only
mailserver port 25; IMAP is disabled and TLS submission is not configured.
Containers use service names and container ports, not published host ports.
An application started on the host instead uses `SMTP_HOST=127.0.0.1` and
`SMTP_PORT=1026` to reach this mailserver.

## Verify feedback delivery

Send feedback from the website, or use its GraphQL endpoint at `/api`:

1. Call `createChatToken(data: { channel: feedback })` to obtain a token.
2. Call `submitFeedback(data: { token: "...", contacts: "Local test", message: "Unique test marker" })`.
3. Find that marker in MailHog. Verify sender, recipient and message contents.
4. Check the Postfix log for `relay=mailhog` and `status=sent`, and the queue for
   undelivered messages:

```bash
docker compose -f compose.yaml -f compose.dev.yaml logs --tail=100 mailserver
docker compose -f compose.yaml -f compose.dev.yaml exec mailserver postconf relayhost
docker compose -f compose.yaml -f compose.dev.yaml exec mailserver postqueue -p
curl --fail http://localhost:8025/api/v2/messages
```

`submitFeedback` reports successful storage before asynchronous SMTP delivery.
A successful GraphQL result alone does not prove mail delivery. SMTP errors are
logged by the application as `Feedback delivery failed`; the feedback remains
saved in its dialogue. Retrying an already saved feedback does not resend mail;
create a new feedback dialogue for a new delivery check.

## External SMTP provider

For direct delivery from the application to a provider, use:

```dotenv
MAIL_FROM=website@your-domain.example
MAIL_TO=owner@your-domain.example
SMTP_HOST=smtp.provider.example
SMTP_PORT=587
SMTP_USER=provider-account
SMTP_PASSWORD=provider-password
SMTP_REQUIRE_TLS=true
```

Replace all example values with provider settings. Port 587 uses STARTTLS; port
465 selects implicit TLS automatically. The application does not require the
local mailserver or MailHog in this mode. If `SMTP_HOST` is empty, the existing
implementation resolves the recipient's MX and defaults to port 25.

For a direct local capture check, use `SMTP_HOST=mailhog`, `SMTP_PORT=1025`, empty
credentials and `SMTP_REQUIRE_TLS=false`; this bypasses mailserver intentionally.

## Production mailserver

Development settings above are for local testing. Production Compose defaults
to mailbox mode and an empty relay host (direct outbound delivery). It does not
publish mailserver ports or mount TLS certificates; those must be configured for
the intended deployment before exposing SMTP/IMAP. MailHog is defined in the base
Compose file, so start selected production services if it is not wanted.

Choose the actual hostname/domain, TLS certificates, allowed sending clients,
accounts and DNS records for that deployment. An empty `MAIL_RELAY_HOST` in dev
still selects MailHog; use production Compose for direct outbound delivery.
For a mailbox deployment, manage accounts with the image's built-in command
instead of a nonexistent repository `setup.sh`:

```bash
docker compose -f compose.yaml -f compose.prod.yaml exec mailserver setup email add user@your-domain.example
docker compose -f compose.yaml -f compose.prod.yaml exec mailserver setup email list
docker compose -f compose.yaml -f compose.prod.yaml exec mailserver setup config dkim
```

Keep the mail hostname distinct from the mailbox domain. Configure MX/A, SPF,
DKIM and DMARC using actual deployment values; local capture does not verify
public delivery or domain authentication. See the upstream
[environment reference](https://docker-mailserver.github.io/docker-mailserver/v16.0/config/environment/)
and [installation guide](https://docker-mailserver.github.io/docker-mailserver/latest/examples/tutorials/basic-installation/).

## Files and persistence

- `config/`: machine-specific accounts and Postfix overrides (gitignored except samples).
- `mail-data/`: mailboxes.
- `mail-state/`: service state and Postfix queues.
- `mail-logs/`: mail logs.

Runtime mailserver data is excluded from Git and application Docker builds.
MailHog uses in-memory storage here; container recreation loses its captured mail.

## Verified locally on 2026-10-19

With Docker Mailserver v16.0.1 (the locally available `latest` image) and MailHog:

- The development application returned HTTP 200 at `http://localhost:3001`.
- A real `createChatToken` / `submitFeedback` request produced the message
  `MAIL-RELAY-2026-10-19T15:36:29.575Z` in MailHog, from
  `website@example.test` to `feedback@example.net`.
- Mail headers recorded app → Postfix → MailHog. Postfix queue ID
  `C80E91667C38` completed with `relay=mailhog:1025` and `status=sent`;
  the mail queue was empty afterward.
- Switching only `SMTP_HOST` / `SMTP_PORT` to `mailhog` / `1025` and recreating
  the app delivered a second feedback directly, without a Postfix hop.
- The application was then restored to `mailserver:25`.

External-provider authentication/TLS and public email delivery were not tested.
The Compose images currently use floating tags; record the image version again
when reproducing this check after pulling newer images.

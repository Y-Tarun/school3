# Balvatika Preschool

Public preschool website and private administrator student-management MVP.

## Prerequisites

- Node.js 20 LTS or later and npm
- PostgreSQL 14 or later
- Optional: a configured WhatsApp Cloud API business account and approved message
  template to enable enquiry notifications

## Clean local setup

1. Install dependencies and create a local PostgreSQL database:

   ```bash
   npm install
   createdb balvatika
   ```

2. Copy `.env.example` to `.env`. Configure `DATABASE_URL`, then generate separate
   secrets for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`:

   ```bash
   openssl rand -base64 48
   ```

   The example JWT values are placeholders; replace them. Set
   `WEB_ORIGIN=http://localhost:5173`. Keep admin credentials and all secrets out of
   source control.

3. Generate the Prisma client and apply local migrations:

   ```bash
   npm run db:generate
   npm run db:migrate:dev
   ```

4. Set `ADMIN_INITIAL_EMAIL` and a unique `ADMIN_INITIAL_PASSWORD` (at least 12
   characters) in `.env`, then create the initial administrator:

   ```bash
   npm run db:seed
   ```

   The seed hashes passwords with Argon2id, is safe to repeat, and does not reset an
   existing administrator's password.

5. Start the API and frontend in separate terminals:

   ```bash
   npm run api:dev
   npm run dev
   ```

Open `http://localhost:5173`. The public site is `/`; admin sign-in is
`/admin/login`. The Vite development server proxies `/api` to the API on port 3000.

## Features and limitations

- Admins can search/filter students, create and edit records, inspect immutable
  read-only history, mark records inactive, and upload private student photographs.
- Student photos accept JPEG, PNG, or WebP up to 5 MiB; the API decodes them, removes
  source metadata, and stores normalized WebP files outside the public web root under
  `local-data/photos`.
- Public contact enquiries are validated and stored in PostgreSQL. WhatsApp template
  notifications are optional; if provider configuration is missing or delivery
  fails, the enquiry remains saved and its notification outcome is recorded.
- With blank `WHATSAPP_*` values, enquiries are stored with
  `PROVIDER_NOT_CONFIGURED`; no notification is sent. See
  [docs/operations.md](./docs/operations.md) for optional provider setup.
- Contact notification retries, production object storage, deployment, and
  reactivation are not implemented. This is a local MVP, not approval to deploy.

## Tests and verification

API integration tests require a dedicated disposable PostgreSQL database whose name
ends in `_test`; the test suite refuses any other name. Apply migrations first:

```bash
createdb balvatika_api_test
export TEST_DATABASE_URL='postgresql://localhost:5432/balvatika_api_test?schema=public'
DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate:deploy
npm run api:test
```

The tests use synthetic data and a temporary photo directory. For the frontend
production build:

```bash
npm run build
```

Read [docs/testing.md](./docs/testing.md) for test coverage and manual end-to-end
checks. For architecture, data fields, API behavior, security boundaries, migrations,
and backup/restore notes, see [docs/architecture.md](./docs/architecture.md),
[docs/data-model.md](./docs/data-model.md), [docs/api.md](./docs/api.md),
[docs/security.md](./docs/security.md), and [docs/operations.md](./docs/operations.md).

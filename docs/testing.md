# Testing

## API tests

The API test suite includes unit validation/configuration tests and Supertest
integration tests against real PostgreSQL. It creates or truncates data only in the
configured dedicated test database. The database name must end in `_test`; the suite
refuses other database names.

1. Create a disposable PostgreSQL database, for example `balvatika_api_test`.
2. Set `TEST_DATABASE_URL` to its connection string.
3. Apply migrations with `DATABASE_URL="$TEST_DATABASE_URL" npm run db:migrate:deploy`.
4. Run `TEST_DATABASE_URL="$TEST_DATABASE_URL" npm run api:test`.

The integration coverage exercises authentication, token rotation and logout,
authorization, student validation, revision creation and history, stale-base behavior,
transaction rollback, concurrent edits, uniqueness, pagination/search/status/lifecycle
filters, revision ownership, private photo upload/retrieval/replacement, invalid image
rejection, durable contact submissions, and notification outcome persistence. WhatsApp
adapter unit tests cover missing configuration, template construction, and provider
failure normalization.

## Other checks

- `npm run build` runs the public site and admin UI production build.
- `npm run db:generate` generates the Prisma client.
- `DATABASE_URL=... npx prisma validate --schema prisma/schema.prisma` validates the
  schema.

Tests use only synthetic student details and a `.invalid` admin email. Photo tests
write into a temporary directory and remove it after the suite.

## Manual end-to-end checks

Start PostgreSQL and apply migrations, then start both `npm run api:dev` and
`npm run dev`. Using only synthetic data, verify:

1. `/admin/login`, list, create/edit, profile, read-only history, and deactivation.
2. Upload a small test JPEG/PNG/WebP, retrieve it from the profile, replace it, and
   confirm the older revision still displays the prior image.
3. Submit `/contact` with and without complete WhatsApp configuration and verify the
   success/failure notice matches the persisted notification outcome.
4. Confirm the Vite client cannot retrieve a student image or enquiry list without an
   admin session, and check the interface at desktop and narrow mobile widths.

Never use real student data or school credentials in local test runs.

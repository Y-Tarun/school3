# Operations

## Environment and local startup

Prerequisites: Node.js 20 LTS or later, npm, and PostgreSQL 14 or later.

1. Install dependencies from the repository root: `npm install`.
2. Create a local database (for a standard local PostgreSQL role):

   ```sh
   createdb balvatika
   ```

3. Copy `.env.example` to `.env`. Set `DATABASE_URL` to the local database, generate
   distinct strong `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values, and set
   `WEB_ORIGIN=http://localhost:5173`. Do not use the committed example secrets.
4. Generate the Prisma client and apply local development migrations:

   ```sh
   npm run db:generate
   npm run db:migrate:dev
   ```

5. Set `ADMIN_INITIAL_EMAIL` and a unique `ADMIN_INITIAL_PASSWORD` of at least 12
   characters in `.env`, then run `npm run db:seed`. Seeding an existing email does
   not reset its password. The initial seed is not a password-rotation command.
6. In one terminal run `npm run api:dev`; in another run `npm run dev`.
7. Open `http://localhost:5173`; admin sign-in is `/admin/login`.

The Vite server proxies `/api` to `http://localhost:3000`. For local photo storage,
ensure the configured `PHOTO_STORAGE_DIR` is writable by the API process. Files are
private, ignored by Git under `local-data/`, and should be included in any local backup
that is intended to preserve photo references.

## Optional WhatsApp Cloud API

Leave all `WHATSAPP_*` credentials blank for local development without notifications.
Enquiries will still be persisted and report `PROVIDER_NOT_CONFIGURED`. To enable
delivery, configure a Meta WhatsApp Cloud API access token, phone-number ID, school
recipient phone, approved template name, template language, and Graph API version.
The template body must accept four text parameters in this order: parent name, parent
phone, class of interest, message. Test only with an authorized recipient and
synthetic enquiry details before using any school data. Use a secret manager rather
than `.env` in hosted environments.

## Migrations and seed

- Inspect migration SQL and test against a disposable database before applying it to
  any shared database.
- For a release or clean environment, use `npm run db:migrate:deploy`; it applies
  committed migrations and does not generate a new migration.
- Use `npm run db:migrate:dev` only for local schema development.
- Do not edit migrations already applied to a shared database.
- The seed creates one admin using Argon2id and is repeat-safe. Password rotation
  needs a deliberate separate procedure; the seed does not update existing accounts.
- Milestone 6 reused existing `photoLocator` and `ContactEnquiry` schema fields, so it
  did not require a schema migration.

## Backup and restoration

These commands are examples for a local PostgreSQL database. Store backups encrypted
with restrictive permissions and outside the web root. Back up the database and
`PHOTO_STORAGE_DIR` together so photo locators remain resolvable.

```sh
umask 077
pg_dump --format=custom --file=balvatika.dump "$DATABASE_URL"
```

Restore only into a separately created recovery database, never over the source
database during a test:

```sh
createdb balvatika_restore_check
pg_restore --no-owner --dbname=balvatika_restore_check balvatika.dump
```

Copy the matching photo-storage backup into an isolated recovery location, point a
local API instance at the restored database and photo directory, and verify a known
synthetic student and historical image. Confirm access remains authenticated. Do not
include `.env`, provider tokens, or real student information in unencrypted backups.
Document backup retention, encryption, and restore drills before any production use.

## Monitoring and known limits

- Check `ContactEnquiry.notificationStatus` for `Pending` and `Failed` rows. No
  automated retry queue exists; a process crash after insert can leave `Pending`.
- Provider failures store normalized error codes, not provider response bodies.
- Local filesystem photo storage needs a durable private volume and a coordinated
  backup/restore process. A reviewed private object-storage adapter is needed for
  multi-instance hosting.
- An abrupt process failure between writing a photo and committing its revision can
  leave an unreferenced file. No automated orphan cleanup or photo-retention job
  exists; define and test both before production.
- Contact/photo rate limits are process-local and reset when the process restarts.
  Production should use a shared store and edge-level request controls.
- No production deployment, WhatsApp credential configuration, template approval,
  compliance review, or external backup service has been performed.
- Review applicable privacy, consent, retention, and data-subject handling
  requirements for children’s records before deployment.

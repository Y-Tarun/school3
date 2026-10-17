# Architecture

## Runtime boundaries

- `apps/web` is a React/Vite single-page app. Public preschool content and contact
  form live outside the lazy-loaded `/admin/*` application. The admin client uses
  MUI, Data Grid, React Hook Form, and Zod.
- `apps/api` is an Express JSON API versioned under `/api/v1`. Routers validate input,
  middleware enforces authentication, and service modules own database workflows.
- `prisma/schema.prisma` defines PostgreSQL persistence. Migrations live in
  `prisma/migrations`; student revisions are immutable snapshots with a constrained
  current-revision pointer.
- `apps/api/src/photo-storage.js` is the photo-storage boundary. Its local filesystem
  adapter stores private, normalized WebP files outside the static web root.
- `apps/api/src/whatsapp-provider.js` is the notification boundary. It has a Cloud API
  template adapter and returns normalized outcomes; notification status is persisted
  separately from enquiry data.

## Important workflows

### Administrator sessions

Passwords are Argon2id hashes. Short-lived bearer access tokens live only in browser
memory. Refresh tokens are HttpOnly cookies backed by hashed, revocable PostgreSQL
records; refresh rotates them. API authorization is checked on every protected
request, regardless of UI route state.

### Students and revisions

`Student` is the stable identity. Student details and `photoLocator` live in immutable
`StudentRevision` snapshots. Create/edit/photo operations create revisions and update
the stable current pointer in a transaction. Stale edits are allowed and explicitly
reported; no field merge is implied.

### Contact enquiries

The public API validates and inserts the enquiry before calling the notification
adapter. Delivery success/failure is persisted in `ContactEnquiry`. A missing provider
configuration is an explicit failed notification, not a failed enquiry submission.
The admin enquiry list is protected by bearer authentication.

## Local versus production

The supported implementation is a local MVP. It uses a local PostgreSQL instance and
local private photo storage. Photo and contact rate limits use process memory. No
production storage, queue, hosting, or secret manager is configured. The production
deployment approach must be reviewed and approved by the project owner before any
deployment work.

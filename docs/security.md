# Security notes

This is a local-development implementation, not a production deployment approval.
Student data and photographs are sensitive personal information.

## Authentication and sessions

- There is no public admin registration. Initial credentials are configured out of
  band and hashed with Argon2id by the seed command.
- Access JWTs are short-lived and returned only in the login/refresh response; browser
  clients must keep them in memory, never localStorage.
- Refresh JWTs are returned only through an HttpOnly, SameSite=Strict cookie, scoped to
  `/api/v1/auth` and marked Secure in production. Their SHA-256 hashes and revocation
  state are stored in PostgreSQL.
- Refresh is rotated transactionally. Reuse of a revoked refresh token revokes active
  refresh tokens in that session. Logout revokes all refresh tokens in that session;
  access middleware checks for an active session, so logout invalidates outstanding
  access tokens immediately.
- Refresh and logout require the exact configured web Origin and a custom
  `X-CSRF-Protection: 1` header. CORS allows only `WEB_ORIGIN` with credentials.
- Login and refresh share a 10-request-per-15-minute IP rate limit. Helmet sets
  standard security headers. Request bodies are limited to 32 KiB.
- Public contact submissions are limited to five per 15 minutes per IP. Photo uploads
  are limited to 20 per 15 minutes per IP and 5 MiB per file.
- JWT access and refresh secrets must each be at least 32 characters and distinct.
  Generate separate random values with `openssl rand -base64 48`; use a secret manager
  in production. Example values are placeholders only.

## Authorization and data handling

- All student, revision, and lifecycle routes require an authenticated Admin verified
  against the database. Authorization is enforced by Express middleware, not the UI.
- Historical revisions have read-only API routes. Writes create snapshots and update
  the current pointer/application number in a database transaction.
- Enquiries are separate from student records. Only enquiry creation is public; the
  paginated enquiry list requires an admin bearer token. Notification failure does not
  discard a saved enquiry.
- Student photos are never mounted as static files. Upload, current-photo, and
  historical-photo routes all require admin authentication and enforce student/photo
  ownership. Files are written outside the web root with restrictive local
  permissions, named by a generated identifier, decoded and re-encoded to WebP (which
  removes source metadata), and served with private no-store caching. Replacing a
  photo preserves its previous revision reference and file.
- WhatsApp delivery uses a configured Cloud API template and an eight-second request
  timeout. Provider responses and credentials are not returned to the browser or
  logged; only normalized outcome codes are recorded. Missing configuration is
  reported as `PROVIDER_NOT_CONFIGURED`, and contact rows remain durable.
- Responses set `Cache-Control: no-store`. Login failures and unexpected request
  failures are logged without passwords, tokens, or student fields. Public error
  messages do not include database errors or stack traces.

## Remaining operational safeguards

- A dependency audit during Milestone 7 reported 11 advisories across the full
  dependency tree (2 critical, 4 high, and 5 moderate). The production-only audit
  reported five (three high and two moderate): `@prisma/config`/`deepmerge-ts`
  (GHSA-ggr8-5vv4-36mx) and `react-router` (GHSA-wrjc-x8rr-h8h6,
  GHSA-337j-9hxr-rhxg). The full audit additionally identifies `vite` and
  `esbuild` advisories (including GHSA-4w7w-66w2-5vf9 and
  GHSA-67mh-4wv8-2f99) and critical `vitest`/`tinypool` advisories (including
  GHSA-5xrq-8626-4rwp and GHSA-5gmw-xhrv-c9v3). npm reports that resolving the
  current findings requires breaking dependency changes. No forced dependency
  upgrades were applied; these findings are unresolved and must be assessed and
  remediated before deployment. The full-tree totals include development tools
  and do not by themselves establish that every advisory is reachable in the
  running application.
- Use HTTPS in production and configure production secrets/origins explicitly.
- Restrict database access and credentials; configure encrypted database backups.
- Local photo storage is single-host filesystem storage. Production needs a reviewed
  private object-storage adapter, durable volume, retention policy, and backup plan.
- A process crash after a photo is written but before its database revision is
  committed can leave an unreferenced private file. No orphan-file cleanup or
  photo-retention job is implemented; define and test both before production.
- Contact and upload rate limits are process-local; production should use a shared
  rate-limit store and edge protections.
- Notification delivery has no retry queue. A process failure after enquiry insert
  but before outcome update may leave the row in `Pending`; operations must monitor
  pending/failed rows until a retry workflow exists.
- The current template adapter requires a Meta-approved template whose body has four
  text parameters in the documented order. Credentials, template approval, recipient
  configuration, and provider terms must be verified before enabling it. Enquiry
  parent names, phone numbers, class interests, and messages are sent to the
  configured WhatsApp recipient and Meta service.
- Review applicable Indian privacy and data-protection requirements before deployment.
- No production deployment has been performed or authorized.

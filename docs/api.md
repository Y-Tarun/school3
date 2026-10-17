# API

The API is versioned under `/api/v1`. Success responses use `{ "data": ... }`; errors
use `{ "error": { "code": "...", "message": "..." } }`. Unexpected internal errors
return a generic message and do not expose database details. API responses use
`Cache-Control: no-store`.

## Authentication

| Method and path | Access | Behavior |
| --- | --- | --- |
| `POST /api/v1/auth/login` | Public, rate-limited | Accepts `{ email, password }`. Returns a short-lived bearer access token and admin summary; sets a refresh token in an HttpOnly cookie. |
| `POST /api/v1/auth/refresh` | Refresh cookie, exact configured Origin and `X-CSRF-Protection: 1` required | Rotates the refresh token and returns a new access token. Reuse of a revoked token revokes that refresh-token session. |
| `POST /api/v1/auth/logout` | Refresh cookie, exact configured Origin and `X-CSRF-Protection: 1` required | Revokes the current refresh-token session and clears its cookie. Existing access tokens for that session are rejected immediately. |
| `GET /api/v1/auth/me` | Admin bearer token | Returns the current admin's ID, email, and role. |

Access tokens are sent using `Authorization: Bearer <token>` and should be held in
browser memory. Refresh tokens are only delivered in an HttpOnly, SameSite=Strict
cookie, secure in production. Login errors are generic. Auth endpoints are limited to
10 requests per 15 minutes per IP.

## Students

All student routes require a valid bearer access token.

| Method and path | Behavior |
| --- | --- |
| `GET /api/v1/students` | Paginated list. Query: `page` (default 1), `pageSize` (default 25, maximum 100), `q`, `status` (`Applied`, `Pending`, `Admitted`, `Rejected`), `lifecycle` (`Active` default, `Inactive`, `All`). List rows include stable student `id`, `currentRevisionId`, application number, name, class/section, admission date, status, lifecycle state, and update time. |
| `POST /api/v1/students` | Creates stable identity and initial revision in one transaction. Requires `applicationNumber` and `firstName`; other legacy details are optional. Returns 201. |
| `GET /api/v1/students/:id` | Returns stable identity and latest full revision. |
| `PATCH /api/v1/students/:id` | Requires `{ basedOnRevisionId, changes }`. Creates a new snapshot based on that revision, applies supplied changed fields, records the acting admin, and sets it current atomically. Older bases are allowed; response includes `staleBase` and the current revision ID observed before the write when stale. Stale snapshots are not automatically merged. |
| `GET /api/v1/students/:id/revisions` | Returns revision metadata in descending revision order. |
| `GET /api/v1/students/:id/revisions/:revisionId` | Returns that student's read-only historical snapshot. A revision belonging to another student returns 404. |
| `PATCH /api/v1/students/:id/lifecycle` | Accepts `{ "lifecycleStatus": "Inactive" }`. Admission status and revision history are unchanged. Reactivation is not supported. |
| `POST /api/v1/students/:id/photo` | Multipart form with one `photo` file. Accepts JPEG, PNG, and WebP up to 5 MiB; verifies and decodes the image, strips metadata by re-encoding to WebP, stores privately, and creates a new revision pointing to it. Limited to 20 uploads per 15 minutes per IP. |
| `GET /api/v1/students/:id/photo` | Returns the current photo as a private, no-store image response. |
| `GET /api/v1/students/:id/photo/:photoId` | Returns a current or historical photo only if the locator appears in that student's revisions. Requires an admin bearer token. |

Application numbers are trimmed and uppercased before storage. Uniqueness is enforced
by PostgreSQL across active and inactive students. A conflict returns 409. Invalid
input returns 400; unauthenticated requests return 401. Student details are never
available through public routes.

Photo files are stored outside the web root under `PHOTO_STORAGE_DIR` (default
`local-data/photos`). Locators are opaque local references, not URLs. Replacing a
photo creates a new immutable revision and retains the former file for historical
snapshots. Only JPEG, PNG, and WebP are accepted; content type and image decoding are
validated, input is limited to 25 million pixels, and image metadata is removed during
WebP re-encoding. A file is removed if its revision cannot be committed.

## Contact enquiries

| Method and path | Access | Behavior |
| --- | --- | --- |
| `POST /api/v1/contact-enquiries` | Public, limited to 5 requests per 15 minutes per IP | Accepts parent name, phone, class of interest, message, and an optional empty `website` honeypot. Persists the enquiry before attempting WhatsApp delivery. Returns only the enquiry ID, creation timestamp, and notification outcome. |
| `GET /api/v1/contact-enquiries` | Admin bearer token | Paginated enquiries and notification outcome/error code, newest first. |

Enquiries accept only `Playway`, `Nursery`, `LKG`, or `UKG`; parent name is limited to
100 characters, phone to 32, and message to 2000. Notification status is `Sent` or
`Failed`. Missing or incomplete WhatsApp configuration records
`PROVIDER_NOT_CONFIGURED`; provider rejection, timeout, or unavailability is recorded
with a normalized error code. Enquiry data remains stored if notification fails.
Unexpected persistence errors use the normal generic API error response. No automatic
retry is implemented.

The WhatsApp adapter uses a pre-approved WhatsApp Cloud API message template with four
body parameters in this order: parent name, phone, class of interest, and message.
Configure `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_RECIPIENT_PHONE`, `WHATSAPP_TEMPLATE_NAME`, and optionally
`WHATSAPP_TEMPLATE_LANGUAGE` and `WHATSAPP_GRAPH_API_VERSION`. Never put credentials
in source control. Without all required settings, enquiries are still saved and the
notification state explicitly reflects that delivery was not configured.

## Request constraints

- JSON bodies are limited to 32 KiB.
- Student create requires a non-empty trimmed application number (maximum 100 chars)
  and first name (maximum 200 chars). First name is not restricted to a character
  pattern, and surname is optional.
- Date fields use `YYYY-MM-DD`; counts are optional integers from 0 through 1000.
- Admission status accepts only the four specified values.
- Unknown request properties are rejected.
- Photo multipart requests allow one file only; maximum file size is 5 MiB.
- Contact submissions are rate-limited; they do not require or accept admin credentials.

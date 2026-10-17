Balvatika Preschool
AI Coding Agent — Project Instructions and Implementation Guide

Project: Balvatika Preschool Website and Student Management System
Document type: Development specification and coding-agent instructions
Initial target: Local development and testing
Development approach: Incremental, testable, reviewable implementation
Primary objective: Build a maintainable, secure, responsive preschool website and an authenticated student administration application.

1. Instructions to the Coding Agent

You are the implementation agent responsible for building Balvatika Preschool's web application.

The project owner understands React and Express but expects you to handle implementation, testing, documentation, and technical decisions within the agreed requirements.

Follow these rules throughout development:

Read this document before modifying or creating code.
Inspect the existing repository before deciding on project structure or installing dependencies.
Implement the application incrementally, following the milestones in this document.
Do not generate the entire application in one pass.
Do not make major product decisions independently.
Prefer simple, established solutions over unnecessary abstractions or custom frameworks.
Keep frontend, backend, database access, validation, and business logic clearly separated.
Write automated tests for important business rules, especially revision history, authorization, and concurrent updates.
Never claim a feature works without running the relevant tests or otherwise verifying it.
Maintain documentation and update it when implementation decisions change.

At the beginning of each milestone, explain its scope, inspect the relevant code, and identify any blocking decisions. Implement only that milestone and its necessary dependencies. At the end, run the appropriate checks and report what changed, what was tested, and what remains incomplete.

If a requirement is ambiguous, use the simplest implementation consistent with this specification. Ask the project owner before changing a major product behavior, data meaning, security model, or public interface.

Non-negotiable rules
Never overwrite existing student revisions.
Never expose student records or photographs through public endpoints.
Never rely on frontend authorization alone.
Never store plaintext passwords or commit secrets.
Never create fake school facts, photographs, testimonials, addresses, or contact details.
Never replace the school's existing logo with a generated logo.
Never add features that are not required without first explaining their value and obtaining approval.
Never physically delete student records or historical revisions through normal admin workflows.
Never silently change database migrations that have already been applied.
2. Product Overview

Build two connected applications.

2.1 Public website

A responsive React Single-Page Application for parents in India.

Its purpose is to communicate the school's welcoming environment, explain its learning approach, showcase real school photographs, and encourage parents to contact the school or arrange a visit.

The brand should feel warm, nurturing, colorful, and premium without becoming cluttered or excessively cartoonish.

2.2 Admin application

A secure administrative interface for managing student records.

It must support:

Admin login and logout.
Student listing, search, filters, and pagination.
Creating and editing students.
Student profiles.
Complete revision history.
Student photo uploads.
Soft deletion through an inactive lifecycle state.
Secure, backend-enforced access control.

The admin interface must be visually distinct from the public website and use Material UI.

2.3 Contact enquiries

Parents can submit a contact form on the public website.

The backend must save each valid enquiry in PostgreSQL and then attempt to notify the school's WhatsApp Business number. A failed notification must not cause the saved enquiry to be lost.

An enquiry-management dashboard is not required in the initial release.

3. Technology Stack

Use the following stack unless a technical incompatibility requires the project owner to approve a change.

Layer	Technology
Language	javascript
Public frontend	React
Routing	React Router
Admin UI	Material UI (MUI)
Student data grid	MUI X Data Grid
Forms	React Hook Form
Form validation	Zod
Backend	Node.js and Express
Database	PostgreSQL
Database access	Prisma ORM, with explicit SQL where justified
Authentication	Short-lived JWT access tokens and refresh tokens
Password hashing	Argon2id
API validation	Zod
File uploads	Multer or an equivalent maintained multipart parser
Testing	Vitest, React Testing Library, and Supertest
End-to-end testing	Playwright for important user flows
Package management	npm workspaces or an existing repository's established package manager

Use compatible, maintained stable releases. Do not install every library mentioned in this document automatically. Inspect the existing project and select only the dependencies needed for the current milestone.

Prisma is the default database-access recommendation for straightforward schema management and migrations. If the repository already uses another suitable database library, evaluate whether retaining it is simpler than replacing it.

Do not introduce Redux, microservices, GraphQL, event streaming, or a complex dependency-injection framework without a demonstrated need.

4. Architecture and Repository Structure

Use a straightforward monorepo containing separate frontend and backend applications.

Suggested structure:

balvatika/ ├── apps/ │ ├── web/ │ │ └── src/ │ │ ├── app/ │ │ ├── components/ │ │ ├── features/ │ │ │ ├── contact/ │ │ │ └── students/ │ │ ├── layouts/ │ │ ├── pages/ │ │ ├── routes/ │ │ ├── styles/ │ │ └── assets/ │ └── api/ │ └── src/ │ ├── config/ │ ├── middleware/ │ ├── modules/ │ │ ├── auth/ │ │ ├── students/ │ │ ├── enquiries/ │ │ └── uploads/ │ ├── services/ │ ├── app.ts │ └── server.ts ├── packages/ │ └── shared/ │ └── src/ ├── prisma/ │ ├── schema.prisma │ ├── migrations/ │ └── seed.ts ├── tests/ ├── docs/ ├── .env.example ├── .gitignore ├── package.json └── README.md

This is a suggested structure, not a requirement to create every directory immediately.

Only add a directory when it contains actual code. Keep shared code limited to genuinely reusable types and schemas. Do not share database models directly with the browser.

Architectural responsibilities

Frontend

Renders the public website and admin interface.
Manages navigation and form state.
Provides client-side validation for usability.
Displays API results and errors.
Never makes authorization decisions on behalf of the backend.

Backend

Owns authentication and authorization.
Validates all incoming data.
Implements student revision rules and business logic.
Coordinates database transactions.
Controls access to student photographs.
Saves enquiries and sends WhatsApp notifications.

Database

Enforces persistent data constraints.
Stores stable student identities and immutable revision records.
Enforces application-number uniqueness.
Stores admin accounts, contact enquiries, and refresh-token records.

External integrations

Student file storage must use a small provider interface.
WhatsApp delivery must use a small notification interface.
External integrations must not be coupled directly to student-management logic.

Keep business rules in backend services rather than duplicating them across Express route handlers.

5. Public Website Requirements
5.1 Routes

Implement:

/ — Homepage.
/contact — Contact and visit enquiry page.

Use React Router. The application must support direct navigation to both routes, browser refreshes, and normal browser navigation.

The homepage should remain a continuous scrolling experience with section navigation.

5.2 Homepage content

Build these sections in order:

Hero.
About Balvatika.
Programs/classes.
Why choose Balvatika.
Gallery preview.
Contact call-to-action.
Footer.
Hero

Use a split layout on desktop:

Left: headline, supporting text, primary CTA, and optional secondary CTA.
Right: custom CSS/SVG illustration with playful decorative elements.

Suggested headline:

Little steps, big beginnings.

Suggested supporting copy:

"Every child has their own way of discovering the world. At Balvatika Preschool, we bring together caring guidance, creative play, and early learning to help little learners grow at their own pace."

Primary CTA: Contact Our School.

Secondary CTA: Explore Our Programs.

The primary CTA navigates to /contact. The secondary CTA scrolls to the programs section.

These are draft content choices and may be refined with the project owner.

About section

Communicate the school's balanced approach to play, creativity, foundational learning, and individual attention.

Do not invent school history, teaching credentials, facilities, awards, or outcomes.

Programs

Show four program cards:

Playway.
Nursery.
LKG.
UKG.

Use concise descriptions only where the wording is consistent with the school's confirmed learning approach. Do not invent age ranges or detailed curricula.

Why choose Balvatika

Use the confirmed school strengths:

Individual attention.
Safe and welcoming environment.
Creative activities and play.
Foundational literacy and numeracy.
Parent–teacher communication.

Do not expand these into unsupported claims such as guaranteed results or specific staff qualifications.

Gallery

Use actual school photographs when supplied.

Until suitable photographs are available, use clearly identifiable placeholders during development. Do not generate images or substitute unrelated stock photographs.

Contact CTA

Invite parents to ask questions or arrange a visit.

The contact form is connected to the backend under Milestone 5.

5.3 Visual design

Use a warm ivory background with restrained, rainbow-inspired accents.

Suggested initial tokens:

Warm ivory: #FFF9F0
Deep plum: #6849A8
Soft rose: #E8A7C8
Mint green: #78B9A1
Sunshine yellow: #E9B849
Primary text: #352C3A

Treat these as initial design tokens, not immutable requirements. Check text contrast before using any combination.

Design rules:

Use generous whitespace.
Use rounded, friendly typography.
Maintain consistent spacing and border radii.
Use custom CSS/SVG decorative elements.
Avoid excessive shadows, gradients, and cartoon graphics.
Keep the logo area as a placeholder until the actual logo is provided.
Build a responsive mobile navigation menu.
Support keyboard navigation, visible focus indicators, semantic headings, accessible labels, and reduced-motion preferences.

Do not install MUI in the public website merely to reuse components. The public and admin applications have different visual requirements.

6. Admin Application Requirements
6.1 Routes

Implement:

/admin/login
/admin/students
/admin/students/:id

The student profile route must support viewing the latest revision, editing student details, and viewing revision history.

Use React Router and an admin-specific layout.

Protect admin routes in the frontend for usability, but enforce authorization independently on the backend.

6.2 Admin design

Use Material UI with:

Neutral backgrounds.
Restrained accent colors.
Clear typography.
Consistent spacing.
Subtle borders.
Responsive navigation.
A desktop sidebar and appropriate mobile navigation.

Use MUI X Data Grid for the student list.

The grid must include:

Application number.
Student name.
Class and section.
Admission date.
Admission status.
Row actions.

Provide:

Search.
Relevant filters.
Pagination.
Add Student.
View profile.
Edit.
View history.
Access to inactive records through a filter.

The default list must include all admission statuses, including Applied, Pending, Admitted, and Rejected. Do not filter out pending applicants or rejected applicants by default.

Exclude inactive records from the default list, but allow the admin to find them.

6.3 Student profile

Display the latest revision by default.

Group fields into readable sections:

Admission information.
Personal information.
Parents/guardians as represented by the existing fields.
Previous schooling.
Other admission information where appropriate.

Include Edit and View History actions.

Historical revisions must be read-only. Do not implement historical restoration in the initial version.

6.4 Student forms

Use React Hook Form and Zod.

Organize fields into logical sections and display clear validation errors.

Start with minimal mandatory fields:

Application number.
First name.

Confirm the exact definition of a valid student name before implementing name validation. Do not assume every child must have both a first name and surname.

Other fields should be optional unless the project owner approves additional requirements.

7. Student Data Model

The original proposed fields must be preserved in meaning:

Id
ParentId
ApplicationNumber
DateOfAdmission
AdmissionSoughtIn
Class
Section
RollNumber
FirstName
Surname
NameUsedAtHome
Gender
DateOfBirth
LanguageSpokenAtHome
Address
FatherName
FatherEducationQualification
FatherOccupation
FatherMobileNumber
MotherName
MotherEducationQualification
MotherOccupation
MotherMobileNumber
PreviousSchooling
PreviousSchoolingDetails
ToiletTrained
BrothersCount
SistersCount
Photolocator
CreatedOn
Status

Do not silently remove, rename, or reinterpret a field.

ParentId is not a foreign key to a parent record. Do not create a parent entity or parent relationship from this field.

Before finalizing database migrations, document the type, nullability, constraints, and intended meaning of each field.

Recommended provisional types:

Field category	Provisional database type
Identifiers	UUID
Application number	String
Names, address, qualifications, occupations	String/text
Admission and birth dates	Date
Created timestamps	Timestamp with time zone
BrothersCount, SistersCount	Non-negative integer
ToiletTrained	Nullable Boolean, pending confirmation
Gender	String or constrained enum, pending confirmation
PreviousSchooling	Nullable Boolean or another confirmed type
Photolocator	Nullable string storage reference
Admission status	Constrained enum

These are provisional recommendations. Review them against the existing system, if any, and obtain approval for consequential type or naming changes before migrations.

7.1 Separate stable identity and revision data

Use two primary student tables.

Students

Represents a student's stable identity.

Recommended fields:

id
currentRevisionId
currentApplicationNumber
lifecycleStatus
createdAt
updatedAt

The current application number must be unique across current student records.

StudentRevisions

Represents an immutable snapshot of student details.

Recommended fields:

id
studentId
revisionNumber
basedOnRevisionId, nullable for the initial revision
All confirmed student-detail fields
createdOn
createdByAdminId

Use a foreign key from StudentRevisions.studentId to Students.id.

The current-revision reference may require a circular foreign-key arrangement. If so, handle creation order and migration constraints explicitly. Do not weaken revision integrity to avoid the modeling issue.

The application number must be retained in each revision. The authoritative current number must also be maintained or otherwise enforced transactionally.

The database must enforce uniqueness for current application numbers. Application-level checks alone are insufficient.

7.2 Admission status and lifecycle

The existing Status field represents admission status.

Allowed admission values:

Applied
Pending
Admitted
Rejected

The admin can select any of these values while editing. Do not introduce a rigid transition workflow.

Introduce a separate record lifecycle field:

Active
Inactive

Marking a record inactive must not change its admission status.

Do not hard-delete the student or its revisions through normal application workflows.

Reactivation rules and UI are deferred.

7.3 Revision invariants

These rules are mandatory:

Creating a student creates the stable record and initial revision.
Every successful student edit creates a new revision.
Existing revisions are never updated or deleted by normal workflows.
Revision creation and the current-revision update occur in one database transaction.
A failed transaction must not leave an orphaned or partially current revision.
The current revision must be identifiable reliably.
Each revision records the acting admin.
Historical revisions are read-only.
Changing the photo preserves the previous photo reference.
Application-number uniqueness is enforced under concurrent requests.

For concurrent edits, allow the admin to create a revision based on an older revision, as agreed. Store basedOnRevisionId and warn when a form is stale.

The latest successful transaction determines the current revision. Do not silently merge fields or claim that conflicting edits have been reconciled automatically.

Test these behaviors using concurrent requests and database transactions.

8. Authentication and Authorization

Use a single Admin role initially.

There is no public admin registration page.

8.1 Initial admin setup

Provide a secure seed or setup command to create the initial admin.

Requirements:

Read initial credentials from environment variables or a secure interactive setup mechanism.
Hash passwords using Argon2id.
Never store or log plaintext passwords.
Make repeated seeding safe and prevent accidental password resets.
Document how to create or rotate the initial credentials.
Do not ship a hardcoded default admin password.
8.2 JWT design

Use:

Short-lived access tokens.
Access tokens held in browser memory.
Refresh tokens delivered through an HttpOnly cookie.
Secure cookies in production.
Appropriate SameSite settings.
Refresh-token rotation.
Server-side refresh-token revocation tracking.
Logout and token-expiry handling.
Rate limiting on authentication endpoints.

Store refresh-token hashes or equivalent revocation-safe identifiers in the database, not reusable plaintext refresh tokens.

Protect cookie-authenticated endpoints against CSRF where applicable. Configure CORS narrowly and do not combine credentialed requests with unrestricted origins.

Do not store access or refresh tokens in localStorage.

8.3 Protected APIs

All student, revision, and photo endpoints require backend authentication and authorization.

Unauthenticated requests must return an appropriate 401 response. Authenticated users lacking the required permission must receive an appropriate 403 response.

Do not return sensitive information in authentication errors.

Use a centralized authentication middleware and consistent error handling.

9. Student Photo Uploads

The existing Photolocator field stores a reference to a photograph, not the photograph itself.

Implement a small storage interface with operations for storing and retrieving files and managing file references.

The initial implementation may use local disk storage. Keep the storage provider replaceable without redesigning student-management logic.

Requirements:

Enforce a reasonable configurable file-size limit.
Allow only approved image formats.
Verify actual file content rather than trusting filename extensions or MIME headers alone.
Generate server-controlled filenames.
Prevent path traversal and arbitrary file access.
Do not serve the storage directory publicly.
Require authorization for photo retrieval.
Avoid logging uploaded file contents or sensitive metadata.
Preserve historical photo references.
Clean up abandoned uploads safely without deleting photographs referenced by revisions.

Document how local photo files are backed up alongside the database.

10. Public Contact Enquiries and WhatsApp
10.1 Contact form

The initial form should include:

Parent's name.
Phone number.
Class of interest.
Message.
Submission timestamp, generated by the server.

Class options:

Playway.
Nursery.
LKG.
UKG.

Validate submissions on the backend using Zod.

Apply reasonable length limits, phone validation appropriate to the intended Indian audience, request-size limits, and rate limiting.

Do not log full enquiry messages or phone numbers unnecessarily.

10.2 Enquiry persistence

Create a dedicated ContactEnquiry table.

Suggested fields:

id
parentName
phoneNumber
classOfInterest
message
createdAt
notificationStatus
notificationErrorCode, nullable

Use an enum or constrained value for notification status, such as:

Pending
Sent
Failed

Keep contact enquiries separate from student records.

The public API must never expose a list of saved enquiries or student records.

10.3 WhatsApp notification flow

The required flow is:

Validate the request.
Save the enquiry in PostgreSQL.
Commit the database transaction.
Attempt the WhatsApp notification through the configured provider.
Record the notification outcome.
Return a clear response to the parent.

If WhatsApp fails, keep the enquiry saved and mark notification delivery as failed or pending, as appropriate.

The initial version does not require an automatic retry queue. Document the manual follow-up process.

Do not report a notification as sent unless the provider has confirmed the relevant successful API response.

Implement WhatsApp integration behind a small interface so local testing can use a mock provider.

When the actual WhatsApp Business configuration is available, implement the real provider using server-side credentials and the provider's supported messaging rules.

Do not expose access tokens, phone-number identifiers, or API secrets to the browser.

11. API Design

Use a versioned API prefix, such as /api/v1.

Use consistent response structures and HTTP status codes. Avoid returning raw database objects.

Suggested endpoint inventory:

Authentication
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET /api/v1/auth/me
Students
GET /api/v1/students
POST /api/v1/students
GET /api/v1/students/:id
PATCH /api/v1/students/:id
GET /api/v1/students/:id/revisions
GET /api/v1/students/:id/revisions/:revisionId
PATCH /api/v1/students/:id/lifecycle
Photos
POST /api/v1/students/:id/photos
GET /api/v1/photos/:photoId

Adapt the photo endpoints to the actual storage model, ensuring authorization and ownership checks.

Contact
POST /api/v1/contact-enquiries

Do not implement public enquiry-list endpoints.

API rules
Validate path parameters, query parameters, and request bodies.
Use pagination on student-list endpoints.
Support search, admission-status filters, and lifecycle filters.
Include all admission statuses by default.
Exclude inactive records by default, with an explicit filter to find them.
Return safe, structured errors.
Do not expose internal stack traces or database errors.
Ensure a revision belongs to the student specified in the URL.
Return only fields required by the requesting view.
Add tests for each protected route.
12. Validation, Errors, and Logging

Use Zod for request validation and React Hook Form with Zod for frontend forms.

Share schemas only where that avoids genuine duplication and does not leak backend implementation details into the browser.

Use centralized Express error handling.

Expected errors should have a stable structure, for example:

{ "error": { "code": "VALIDATION_ERROR", "message": "Please correct the highlighted fields." } }

Do not return stack traces, SQL statements, password hashes, access tokens, or sensitive student details.

Use structured logs for operational events, such as:

Server startup and shutdown.
Request failures.
Authentication failures, without credentials.
Database connection failures.
WhatsApp provider failures, without message contents or secrets.

Never log full student records or complete contact enquiries by default.

Use environment-based configuration with validation at application startup. Fail clearly when required production configuration is missing.

13. Security and Privacy

Treat student records and photographs as sensitive personal information.

Implement the following:

Backend authorization on every protected endpoint.
Parameterized database access through the ORM or safe query APIs.
Secure password hashing.
Refresh-token revocation.
HTTPS in production.
Restricted CORS.
Request-size limits.
Login and contact-form rate limiting.
Safe file upload validation.
Generic public-facing error messages.
Minimal logging of personal information.
No public access to student photographs.
No secrets committed to source control.
Appropriate database and photo backups.
Secure environment-variable handling.
A documented process for restoring a backup.

Use realistic synthetic data in development and tests.

Do not assume that a local development setup is production-ready simply because the application starts successfully.

Before deployment, review applicable Indian privacy and data-protection requirements with the project owner or an appropriate professional.

14. Coding Standards and Good Practices
javascript
Avoid any; use explicit types or unknown with validation.
Avoid unnecessary type assertions.
Prefer readable names and small functions.
Use explicit return types on important public functions where helpful.
Avoid duplicated domain types when a shared definition is genuinely appropriate.
React
Use functional components and hooks.
Keep components focused on one clear responsibility.
Extract reusable components when repetition justifies it.
Avoid overly large page components.
Avoid unnecessary global state.
Keep server data separate from transient UI state.
Use accessible form labels and error messages.
Avoid unnecessary useEffect calls for values that can be derived directly.
Keep loading, empty, success, and error states explicit.
Express
Keep route handlers thin.
Put business rules in service functions.
Keep database access in a clear data-access layer or focused service methods.
Validate all external input.
Use centralized error handling.
Avoid circular dependencies.
Do not introduce generic repositories or elaborate service abstractions without a concrete need.
Database
Use version-controlled migrations.
Add appropriate unique constraints, foreign keys, and indexes.
Keep revision snapshots immutable in application workflows.
Use transactions for related writes.
Avoid unnecessary denormalization.
Document deliberate denormalization when maintaining a current application number or revision pointer.
Never change an already-applied migration to represent a new schema change; create a new migration.
Dependencies
Prefer established libraries.
Avoid redundant libraries with overlapping responsibilities.
Keep dependencies updated responsibly.
Do not install a package merely because it is popular.
Document any unusual dependency or architectural choice.
Code quality
Use a consistent formatter and lint configuration.
Avoid commented-out code and unused files.
Avoid speculative abstractions for features not yet needed.
Write comments explaining business rules and non-obvious decisions, not every line of code.
Keep functions, files, and modules reasonably small without enforcing arbitrary size limits.
15. Testing Requirements

Testing is part of implementation, not a final optional activity.

Unit tests

Test:

Admission-status validation.
Lifecycle-state behavior.
Required student fields.
Application-number normalization and uniqueness rules.
Revision creation rules.
Stale-revision detection.
Enquiry validation.
Authorization helpers.
Integration tests

Test against a real test PostgreSQL database or an appropriately isolated database environment.

Verify:

Creating a student creates an initial revision.
Editing creates a new revision.
Historical revisions remain unchanged.
Revision creation and current-revision updates are atomic.
Duplicate current application numbers are rejected.
Concurrent updates cannot violate revision integrity.
Inactive students are excluded from the default list.
Historical revisions cannot be edited through the API.
Unauthenticated users cannot access protected student endpoints.
Unauthorized photo access is denied.
Failed WhatsApp notifications do not lose enquiries.
Public endpoints do not reveal saved student or enquiry records.
End-to-end tests

Use Playwright for important flows:

Open the homepage and navigate to Contact.
Submit a contact enquiry.
Log in as the seeded admin.
Create a student.
Open the student profile.
Edit the student and inspect revision history.
Filter the student list by admission status.
Mark a student inactive and verify default filtering.
Log out and verify that protected endpoints no longer authorize the session.

Use synthetic student information and test credentials.

16. Environment Configuration

Provide .env.example with documented variable names and safe placeholder values.

Potential variables include:

NODEENV=development DATABASEURL= WEBORIGIN=http://localhost:5173 APIPORT=3000

ADMININITIALEMAIL= ADMININITIALPASSWORD=

JWTACCESSSECRET= JWTACCESSTTL= JWTREFRESHSECRET= JWTREFRESHTTL=

PHOTOSTORAGEDRIVER=local PHOTOSTORAGEPATH=

WHATSAPPPROVIDER= WHATSAPPACCESSTOKEN= WHATSAPPPHONENUMBERID=

This is a configuration outline, not a final environment contract. Choose exact variable names and formats during implementation and keep them consistent across code and documentation.

Requirements:

Validate required variables at startup.
Use sufficiently strong random secrets.
Do not provide real secrets in .env.example.
Ignore local .env files in Git.
Document which values are optional in local development and which are mandatory for production.
Never expose server secrets through frontend build variables.
Avoid using a real school's credentials or personal data in automated tests.
17. Development Milestones

Implement the project in the following order.

Milestone 1 — Public website foundation

Build:

React + javascript setup.
React Router.
Design tokens and global styles.
Responsive header.
Homepage hero.
CSS/SVG illustration.
Initial mobile layout.

Acceptance criteria:

Desktop and mobile layouts work.
The logo placeholder can be replaced easily.
Navigation works.
No invented school information is displayed.
Type checking, linting, and relevant tests pass.

Stop and report results before continuing.

Milestone 2 — Complete public website

Build:

About section.
Programs section.
Why choose Balvatika section.
Gallery preview.
Contact CTA.
Footer.
Contact page layout and form UI.

The form may use a clearly identified development stub until the backend is ready. Do not claim submissions are persisted yet.

Acceptance criteria:

All homepage sections are responsive.
Real photographs can replace placeholders.
Accessibility basics are implemented.
Direct navigation to public routes works.

Stop and report results.

Milestone 3 — Database schema and migrations

Before implementing student-management APIs:

Document every original student field.
Confirm unresolved types and nullability.
Define Students and StudentRevisions.
Define lifecycle and admission status separately.
Define current application-number uniqueness.
Define the current-revision pointer.
Define revision metadata.
Define the admin table.
Define contact-enquiry persistence.
Write migrations and a secure initial-admin seed.

Acceptance criteria:

Migrations run against a clean local database.
Constraints and indexes are present.
The schema is documented.
Seed behavior is safe to repeat.
The project owner reviews consequential schema changes before they are finalized.

Stop and report results.

Milestone 4 — Authentication and student APIs

Build:

Login, refresh, logout, and current-admin endpoints.
Password verification.
JWT lifecycle and refresh-token revocation.
Authentication middleware.
Student list and filtering APIs.
Create and edit APIs.
Revision-history APIs.
Lifecycle update API.
Validation and error handling.

Acceptance criteria:

Every protected endpoint enforces backend authorization.
Revisions are immutable through normal workflows.
Concurrent writes preserve revision integrity.
Application-number uniqueness is enforced by the database.
Integration tests pass.

Stop and report results.

Milestone 5 — Admin interface

Build:

Admin login page.
Admin layout and navigation.
MUI Data Grid student list.
Search and filters.
Create/edit student forms.
Student profile.
Revision history.
Inactive-record filtering.
Appropriate loading, empty, and error states.

Acceptance criteria:

All required student workflows work against the backend.
Historical revisions are read-only.
All admission statuses appear by default.
Inactive records can be found.
Forms display validation errors clearly.
Backend authorization remains effective regardless of UI state.

Stop and report results.

Milestone 6 — Photo uploads and contact integration

Build:

Authorized photo upload and retrieval.
Storage abstraction with a local implementation.
Contact-enquiry API.
PostgreSQL persistence.
WhatsApp notification interface.
Real provider integration when credentials are available.
Notification status recording.

Acceptance criteria:

Invalid uploads are rejected.
Student photographs cannot be accessed publicly.
Previous photo references are preserved.
Enquiries survive notification failures.
The notification status reflects the provider result.
Missing provider configuration is handled explicitly.

Stop and report results.

Milestone 7 — Verification and local MVP

Complete:

Unit and integration tests.
Critical end-to-end tests.
Security review.
Migration and seed verification.
Backup and restore instructions.
Local setup documentation.
Known limitations and deployment preparation notes.

Acceptance criteria:

A developer can start the project from a clean checkout by following the README.
The critical student, authentication, revision, and contact flows pass tests.
No secrets are committed.
Outstanding external configuration requirements are documented.
The project owner receives a concise completion report.

Do not begin production deployment until the project owner approves the deployment approach.

18. Documentation Requirements

Maintain the following documents:

README.md — setup, prerequisites, scripts, and local development.
docs/architecture.md — application boundaries and key design decisions.
docs/data-model.md — fields, types, nullability, and revision semantics.
docs/api.md — endpoints, request/response behavior, and authorization.
docs/security.md — authentication, file access, privacy, and operational safeguards.
docs/testing.md — test commands and integration-test setup.
docs/operations.md — migrations, seed commands, backups, restoration, and environment configuration.

Keep documentation synchronized with actual implementation. Do not document planned behavior as implemented behavior.

19. Coding Agent Workflow

For every milestone, follow this workflow.

Step 1: Inspect

Read the relevant files and understand existing conventions before editing.

Step 2: Plan

State the milestone objective, files likely to change, important decisions, and acceptance criteria.

Step 3: Implement

Make small, coherent changes. Avoid unrelated refactoring.

Step 4: Verify

Run formatting, linting, type checking, relevant tests, and the application where possible.

Step 5: Review

Inspect the diff for:

Accidental changes.
Duplicated logic.
Security problems.
Missing validation.
Unnecessary dependencies.
Broken routes.
Inconsistent documentation.
Step 6: Report

Provide:

What was implemented.
Files or modules changed.
Commands and tests run.
Test results.
Known limitations.
External setup still required.
The next recommended milestone.

Do not continue to the next milestone automatically if the current milestone has failed its acceptance criteria or requires a significant unresolved product decision.

Do not repeatedly ask the project owner to approve trivial naming or implementation details. Make sensible, reversible engineering decisions within the agreed architecture and document them.

20. Definition of Done

A feature is complete only when:

Its requirements are implemented.
Validation and error handling are present.
Relevant tests pass.
Authorization and privacy requirements are satisfied.
The code follows existing conventions.
Documentation is updated where necessary.
The feature has been manually verified where appropriate.
Remaining limitations are explicitly reported.

A successful build alone does not mean a feature is complete.

Final Instruction

Begin by inspecting the repository and determining whether a project already exists.

If no project exists, initialize the smallest reasonable workspace needed for Milestone 1. Implement only the public website foundation, responsive header, and hero section. Do not create the complete homepage, backend, database, authentication, or student-management system in the same pass.

Review the result, verify the acceptance criteria, and report the outcome before continuing.

Preserve the agreed requirements throughout development. Prioritize correctness, security, maintainability, and a polished user experience over implementation speed or unnecessary complexity.

Commit frequently in small, self-contained atomic chunks. Do not combine unrelated refactoring, feature additions, or bug fixes into a single commit.
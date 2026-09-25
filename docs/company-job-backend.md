# Company and job backend phase

This phase adds PostgreSQL-backed company profiles and job listings, public discovery endpoints, employer-owned profile/job operations, and admin-controlled company approval. Candidate application review remains a later phase.

## Database changes

The additive migration is `migrations/20260923_companies_and_jobs.sql`. Apply it from `jobseeker_backend/` with:

```powershell
npm run db:migrate:companies-jobs
```

It preserves existing job IDs and their saved-job/application references. Existing `COMPANY` users are backfilled into `companies`; their sign-in email is not copied into the public contact field. Existing seeded jobs remain marked as demos.

The main relationships and constraints are:

- `companies.ownerUserId` references one `users` row and is unique for real companies. Demo/editorial company rows may have no owner.
- `jobs.companyId` references its owning company. Non-demo jobs must have an owner; demo listings may remain ownerless.
- Applications keep their existing restrictive foreign key to `jobs.id`. Employer delete requests archive a listing so application records and saved references remain intact.
- Database checks constrain job status/type/workplace values, salary ranges, vacancy counts, experience years, and company ownership. Indexes cover public status/date ordering, company/status views, category, industry, location, skills, and audit lookups.
- Job descriptions, responsibilities, requirements, benefits, and skills are stored with the listing; repeatable text sections use JSONB. Category and industry are bounded text fields in this phase. Curated category/industry/skill catalogs and their admin CRUD belong to the later master-data phase.
- `audit_logs` records the admin actor, subject company, action, and before/after verification state. Audit actor rows are protected from deletion.

## API routes

All routes use `/api/v1` as the base. Public routes only return published, non-expired jobs attached to approved companies, plus demo listings. Public company routes only return approved company profiles.

Public job discovery:

```text
GET /jobs?page=1&limit=20&search=designer&location=London
GET /jobs?category=Design&industry=Technology&jobType=FULL_TIME
GET /jobs?workplaceType=REMOTE&minSalary=50000&maxSalary=100000&sort=salary_desc
GET /jobs?datePosted=7d
GET /jobs/featured
GET /jobs/categories
GET /jobs/:jobId
GET /jobs/:jobId/similar
```

Search, location, category, industry, type, workplace, experience, salary, and date-posted filters can be combined. `datePosted` accepts `24h`, `7d`, or `30d`. `limit` is capped at 50. `sort` accepts `newest`, `salary`, `salary_asc`, or `salary_desc`.

Public company discovery:

```text
GET /companies?search=studio&industry=Technology&location=Phnom%20Penh
GET /companies/:id-or-slug
GET /companies/:id-or-slug/jobs?page=1&limit=20
```

Company owner routes require an authenticated, email-verified account with the `COMPANY` role. Company approval is a separate admin-controlled requirement for public visibility and job publishing:

```text
GET   /company/profile
PATCH /company/profile
GET   /company/jobs?status=DRAFT&page=1&limit=20
POST  /company/jobs
GET   /company/jobs/:jobId
PATCH /company/jobs/:jobId
PATCH /company/jobs/:jobId/publish
PATCH /company/jobs/:jobId/unpublish
PATCH /company/jobs/:jobId/close
PATCH /company/jobs/:jobId/archive
DELETE /company/jobs/:jobId       # archives; does not physically delete
```

Job creation accepts the listing fields from the specification: title, team, location, country/city/address, category/industry, job and workplace type, salary/currency/period, summary and description, responsibilities, requirements, benefits, skills, experience/education requirements, vacancies, and deadline. Title and location are required to save a draft. Description is required before publishing.

Company fields include name, industry, size, founded year, location, HTTPS website, description, optional public contact email, timezone, HTTPS social links, logo URL, and banner URL. Logo/banner upload and cloud file storage are not part of this phase.

Admin approval routes require an authenticated, email-verified account with the `ADMIN` role:

```text
GET   /admin/companies/pending
PATCH /admin/companies/:companyId/verify
PATCH /admin/companies/:companyId/unverify
```

The pending response includes owner contact details only on this admin-protected endpoint. Verification changes and the acting admin are recorded atomically in `audit_logs`.

The `pending`, `:id/verify`, and `:id/unverify` routes remain as compatibility aliases. They now use the same locked, audited admin service as the newer operations; approving a company also requires its owner account to be verified and active.

## Security behavior

- Company/job mutation is protected by both `SessionGuard` and a role guard. The session guard reloads the account and role from PostgreSQL; the request body cannot select or override the owner.
- Each employer job query is scoped to the company derived from the current account. Guessing another company's job ID returns not found.
- Company and job DTOs accept only editable business fields. Global validation rejects unknown properties such as `ownerUserId`, `companyId`, `isVerified`, `isDemo`, `isFeatured`, and `status`.
- Public response projections omit account email, owner ID, password/session material, and storage internals. A public contact address appears only if the company explicitly supplies one.
- Public category counts use the same published, approved, verified-company, non-suspended, and non-expired visibility rules as public job search; private or moderated listings are not counted.
- Only admins can set verification. Unapproved companies can prepare drafts but cannot publish. Unapproved profiles and their listings are excluded from public APIs; new applications are also rejected if the company has been unverified.
- Job state changes use a locked database transaction. Archive is the API's delete behavior, preserving the foreign-key-protected application history.
- DTOs bound string lengths, arrays, numeric ranges, pagination, enums, HTTPS URLs, and email values. Salary range, status, and ownership rules are also checked in PostgreSQL.
- Search values are passed as bound query parameters. Public listing responses are allowlisted rather than serializing the Company entity and its owner relation.

## Employer applicant review

The additive migrations `migrations/20260923_employer_applicant_review.sql` and `migrations/20260923_interviews.sql` create private application notes, constrain stored application states, and add interview scheduling. Apply them from `jobseeker_backend/` with:

```powershell
npm run db:migrate:employer-applicants
npm run db:migrate:interviews
```

Company applicant routes require an authenticated, email-verified `COMPANY` account:

```text
GET    /company/applications?jobId=...&status=SHORTLISTED&search=...&skill=...&page=1&limit=20
GET    /company/jobs/:jobId/applications
GET    /company/applications/:applicationId
PATCH  /company/applications/:applicationId/status
GET    /company/applications/:applicationId/resume
GET    /company/applications/:applicationId/notes
POST   /company/applications/:applicationId/notes
DELETE /company/applications/:applicationId/notes/:noteId
POST   /company/applications/:applicationId/interviews
GET    /company/interviews?page=1&limit=20
PATCH  /company/interviews/:interviewId
PATCH  /company/interviews/:interviewId/cancel
GET    /interviews/me?page=1&limit=20
```

Employer status changes are limited to hiring states. `APPLIED` is assigned at candidate submission and `WITHDRAWN` is candidate-controlled. A row lock serializes concurrent decisions; the status, history entry, and candidate in-app notification commit in one transaction. Rejected, hired, and withdrawn applications are terminal. Repeating the current status is idempotent and does not create duplicate history or notifications. Scheduling an interview for an active application advances it to `INTERVIEW` in the same transaction.

Notes are plain text in a separate `application_notes` table and are never included in candidate application responses. Candidate detail responses sent to employers are allowlisted: they omit internal user IDs, birth date, and resume storage keys. Resume download re-checks that the application belongs to a job owned by the requesting company, streams the stored PDF as a private attachment, and sets no-store/nosniff headers. Interviews are linked to the application, require a future timestamp with an explicit timezone, require a location for on-site meetings and an HTTPS URL for online meetings, and notify the candidate in-app and by email when scheduled, updated, or cancelled. Candidates can only read interviews linked to their own applications.

## Candidate/company messaging and activity email

The additive migration `migrations/20260923_application_messaging.sql` creates `application_messages`. Apply it from `jobseeker_backend/` with:

```powershell
npm run db:migrate:application-messaging
```

Candidate and company message routes require their respective authenticated, email-verified roles:

```text
GET   /applications/me/:applicationId/messages?page=1&limit=50
POST  /applications/me/:applicationId/messages
PATCH /applications/me/:applicationId/messages/read
GET   /company/applications/:applicationId/messages?page=1&limit=50
POST  /company/applications/:applicationId/messages
PATCH /company/applications/:applicationId/messages/read
```

The request body is `{ "body": "..." }`; the API derives the recipient from the submitted application and its current company owner. A candidate can only access their own thread; a company can only access applications for its own jobs. Sample/demo applications have no real employer participant and cannot be messaged. Message bodies are plain text, trimmed, and limited to 5,000 characters. A transaction locks the application row before enforcing a 30-message-per-hour cap per participant/thread. Thread responses expose sender role, message text, timestamps, and unread count, but not participant IDs or emails. Message and read-thread responses set `Cache-Control: private, no-store`.

Messages have foreign keys to the application and both user accounts, cascade when those records are deleted, and are protected by database checks for non-empty bounded text and distinct participants. Indexes support chronological thread reads, unread lookups, and the rate-cap count.

Activity emails are sent for new applications and candidate withdrawals (to the company owner), company status changes and interview schedule/update/cancellation (to the candidate), and new messages (to the other participant). Emails contain only a generic alert and an in-app link, never application details or message text. `RESEND_API_KEY` enables delivery; without it activity email is skipped. Email failures are best-effort after the database transaction, so they do not undo saved activity or encourage duplicate writes. There is no durable email outbox/retry worker in this phase; delivery recovery is a later reliability improvement. Unit tests mock the provider and do not send real email.

## Admin operations and moderation

The additive migration `migrations/20260924_admin_operations.sql` adds account suspension fields and a session-version counter, company suspension and moderation notes, and job moderation state. Apply it from `jobseeker_backend/` with:

```powershell
npm run db:migrate:admin-operations
```

The migration preserves existing accounts, companies, jobs, applications, and audit records. Existing job rows are created with moderation status `APPROVED`; new jobs default to `PENDING`. PostgreSQL checks keep moderation states valid, require an explanation when a job is rejected/hidden or an account is suspended, and prohibit an approved company from retaining an old rejection note. Indexes support suspended-account/company lists and the pending moderation queue.

All endpoints below require an email-verified session whose current database role is `ADMIN`:

```text
GET   /admin/users?search=...&role=USER&suspended=false&page=1&limit=20
GET   /admin/users/:userUuid
PATCH /admin/users/:userUuid/suspend       { "reason": "..." }
PATCH /admin/users/:userUuid/unsuspend

GET   /admin/companies?search=...&status=PENDING&page=1&limit=20
PATCH /admin/companies/:companyUuid/approve
PATCH /admin/companies/:companyUuid/reject { "reason": "..." }
PATCH /admin/companies/:companyUuid/suspend { "reason": "..." }
PATCH /admin/companies/:companyUuid/unsuspend

GET   /admin/jobs?moderationStatus=PENDING&status=PUBLISHED&search=...&page=1&limit=20
PATCH /admin/jobs/:jobId/approve
PATCH /admin/jobs/:jobId/reject            { "reason": "..." }
PATCH /admin/jobs/:jobId/hide              { "reason": "..." }

GET   /admin/audit-logs?search=...&page=1&limit=20
```

`limit` is capped at 100 and moderation/suspension reasons are trimmed, required for negative actions, and limited to 500 characters. User/company/job lists use explicit public-safe projections and never include passwords, password-reset tokens, resume data, or storage keys. Admin access is checked with the authenticated user's current database role, not a role claim supplied by the browser. Admins cannot suspend their own account.

Every state-changing operation locks the target row and saves both the change and its `audit_logs` row in the same transaction. Repeating an unchanged action is idempotent and does not create duplicate audit events. The audit log records the acting admin, action, target, timestamp, and relevant before/after state or reason; its actor foreign key continues to prevent removal of the user record that anchors the history.

Suspending a user blocks new logins and invalidates already-issued access tokens at the next request because `SessionGuard` reloads account status from PostgreSQL. A monotonic session-version value also means an old token stays invalid after the account is restored; the user must sign in again. The affected account receives the admin-provided reason in the forbidden response. Suspending a company removes its public profile and listings, prevents new applications, blocks the owner from employer-only routes, and increments the owner's session version. Unsuspending restores the company's previous approval state; it does not silently approve a previously rejected company.

New employer-created jobs begin in `PENDING`. Publishing or editing a job does not bypass moderator review: a new/edited listing is invisible to public job search and cannot receive applications until an admin approves it. Rejecting or hiding an existing job removes it from public search/detail/similar/featured results and blocks new applications; approval can restore it if the employer has also published it and the company remains approved and active. Existing jobs are grandfathered as approved by the migration so the rollout does not unexpectedly remove current listings.

Moderation is reversible rather than destructive. A scam listing can be hidden immediately while its prior applications, saved-job references, and audit history remain available for investigation. Likewise, account suspension preserves application and hiring records; there is no physical user/company/job deletion endpoint in this phase.

## User reports and admin review

The additive migration `migrations/20260924_abuse_reports.sql` adds `abuse_reports`. Apply it from `jobseeker_backend/` with:

```powershell
npm run db:migrate:abuse-reports
```

Signed-in users can report a real job, company, or account and check the status of their own submissions:

```text
POST /reports
GET  /reports/me?status=OPEN&page=1&limit=20
```

The submission body contains `subjectType` (`JOB`, `COMPANY`, or `USER`), `subjectId`, `category` (`SCAM`, `HARASSMENT`, `FALSE_INFORMATION`, `INAPPROPRIATE`, `EXPIRED_OR_FILLED`, or `OTHER`), and a 20–3,000 character description. Reporter identity is derived from the authenticated session. The API verifies the target exists, rejects self-reports and demo listings, and does not expose another user's report history.

Admins can triage, inspect, and close reports:

```text
GET   /admin/reports?status=OPEN&subjectType=JOB&category=SCAM&page=1&limit=20
GET   /admin/reports/:reportUuid
PATCH /admin/reports/:reportUuid/start-review
PATCH /admin/reports/:reportUuid/resolve  { "note": "..." }
PATCH /admin/reports/:reportUuid/dismiss  { "note": "..." }
```

The default queue contains open and in-review reports; `limit` is capped at 100. A resolution/dismissal note is required and limited to 3–500 trimmed characters. Admin responses include only allowlisted reporter and target details; sensitive password, token, resume, and storage fields are not returned. All report responses set `Cache-Control: private, no-store`.

Abuse protection uses a five-submissions-per-hour cap per reporter, serialized by locking the reporter row, plus a PostgreSQL partial unique index that prevents the same user from opening duplicate reports for the same target. Closed reports free that active-report slot, so a genuinely new issue can be reported later. State transitions lock the report row and commit the new state together with an `audit_logs` event. The subject is a polymorphic type/ID rather than a foreign key because jobs, companies, and users have different ID types; retaining this reference lets staff investigate the report and audit trail even if the target is later removed.

Resolving a report records the moderation decision but does not automatically hide a job or suspend an account. Admins use the existing job/company/user moderation endpoints when enforcement is warranted; this keeps an unverified allegation from automatically penalizing a user. For example, if someone reports a listing asking applicants to pay an upfront fee, staff can review the evidence, hide the listing with the existing job moderation route, then resolve the report with a note. Without this workflow the complaint may be lost in email or chat, repeated complaints are harder to correlate, and there is no durable record of who reviewed it or why.

## Current integration boundary

The public job and company directory/detail pages now consume the database-backed discovery APIs, with server filtering and pagination. The application form fetches its job, deadline, and demo status by backend job ID. Home-page featured jobs use `/jobs/featured`, latest jobs use the newest public listings, and category cards use public counts from `/jobs/categories`. Saved-job and draft cards hydrate each stored job ID from the public job API; unavailable listings remain removable and drafts remain deletable without exposing private job data. These seeker surfaces no longer depend on the sample catalogue for current job details. The configured local database has no verified demo company profile, so the public company directory may be empty until an employer is approved; that is the intended moderation boundary. The user report form/history and admin report queue are wired into the Vue UI; the API intentionally rejects demo/stale report targets. There is no public candidate-profile page yet for a report-user action. Other admin APIs still need dashboard UI integration; taxonomy CRUD, announcements, settings, and platform analytics remain future work.

Real-time notification delivery now uses a WebSocket-only Socket.IO transport. The notification gateway authenticates each connection through the same session checks used by REST, and the existing REST endpoints remain responsible for persisted notifications, history, and read state. See [`realtime-notifications.md`](realtime-notifications.md) for the event contract, security checks, and deployment boundary.

## Validation

`npm run build`, targeted ESLint for the reports implementation, and all 15 backend Jest suites (63 tests) pass. The additive applicant, interview, messaging, admin-operations, and abuse-report migrations have been applied locally; the admin migration preserved the 4 users, 1 company, and 7 jobs already in the database. The abuse-report migration was safely rerun, preserved existing report rows, and its runner verified the report foreign keys, check constraints, and indexes; the local table currently contains 0 reports. A production-mode startup with database schema synchronization disabled registered the report routes; unauthenticated requests to `GET /api/v1/admin/reports` and `POST /api/v1/reports` returned `401`, and the test server was stopped. Existing tests cover admin-only authorization, suspended-user token invalidation, company suspension blocking employer routes, self-suspension prevention, owner email verification before company approval, and atomic moderation/audit behavior; new report tests cover authenticated reporter identity, self-report rejection, the `429` rate limit, duplicate protection, and audited resolution. The local database has no application records, so an authorized end-to-end application/message/interview workflow still needs a test candidate, company, and submitted application.

The WebSocket notification addition separately passed `npm run build`, the full backend Jest suite (19 suites, 74 tests), and the frontend production build plus all 62 Playwright tests. Dedicated live-socket tests verify unauthenticated/disallowed-origin rejection, recipient-only event delivery, and closure after session revocation. `npm audit` reports zero vulnerabilities after compatible updates to the existing upload and query-parser dependencies.

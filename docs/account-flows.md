# Signed-in job seeker experience

Normal USER login opens `/`. COMPANY opens `/company/dashboard`; ADMIN opens
`/admin`. The retired `/dashboard` route redirects home. Login may return a
job seeker to a requested in-app page; external URLs and other roles' pages
are not accepted as return destinations.

The shared public header shows an initials avatar for signed-in accounts.
Job seekers can open Profile, Saved jobs, Application drafts, or Sign out.
Company/admin accounts get their own dashboard link. The menu supports
outside click, Escape, arrow keys, Home/End, focus management, and mobile use.

## Account pages

- `/profile`: edit name, headline, location, and biography. Email and role cannot
  be changed through this form. Updates appear immediately in the header.
- `/saved-jobs`: persistent bookmarks shared by landing, listing, company,
  and job-detail cards. Guests sign in and return before choosing to save.
- `/jobs/:id/apply`: prepare a private cover letter and optional HTTPS résumé link.
- `/applications`: continue or delete private application drafts.

The current listings come from `src/data/catalog.ts`, not a live employer
job API. Drafts are explicitly **not submitted**. No application or email
is sent, and no résumé file is uploaded. Employer submission is a separate,
unfinished integration.

## Backend setup

Use the existing backend with `DATABASE_URL`, a strong `JWT_SECRET`, and
`FRONTEND_URL` matching the frontend origin. Keep `VITE_API_URL` pointed at
the backend's `/api/v1` base URL. Registration/email settings are unchanged.

Development uses the existing TypeORM synchronization setting to add the
profile columns and activity tables. For production, apply the additive
`jobseeker_backend/migrations/20260911_user_activity.sql` migration to the
intended database before deployment; production synchronization stays off.

Every protected request verifies the JWT, expiration, current database user,
verified-email state, and current database role. Activity is scoped to the
authenticated user ID, never an ID supplied by the client. Logout/expiry
clear reactive account data; remembered sessions synchronize across tabs.

Endpoints under `/api/v1`:

- `GET /auth/me`
- `PATCH /account/profile`
- `GET /account/saved-jobs`
- `PUT|DELETE /account/saved-jobs/:jobId`
- `GET /account/application-drafts`
- `PUT|DELETE /account/application-drafts/:jobId`

## Verification

Frontend: `npm run build`; `npx playwright install chromium` once, then
`npm run test:e2e`. Browser tests run desktop and mobile against isolated
API fixtures, without sending email or modifying real accounts.

Backend: `npm run build`; `npm test -- --runInBand`.
`npm run test:account-storage` additionally verifies the actual configured
PostgreSQL schema using a transaction that always rolls back its fixtures.
It never synchronizes schema or calls an email provider.

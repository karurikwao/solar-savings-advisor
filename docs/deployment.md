# Deployment

This project builds the Astro public website and serves it with a small Node.js runtime for submission capture, admin login, password reset, lead exports, and runtime ad snippets.

## Build

```bash
npm run build
```

Output:

```text
dist/
```

The runtime command is:

```bash
npm run start
```

## Coolify

Use the Dockerfile deployment path. The container serves both static pages and API routes on port `80`.

Required environment variables:

```text
DATABASE_URL=postgres://...
ADMIN_TOKEN=<long random token>
ADMIN_EMAIL=admin@example.com
ADMIN_INITIAL_PASSWORD=<temporary first password>
```

Optional environment variables:

```text
DATABASE_SSL=false
DATABASE_POOL_SIZE=5
ADMIN_SESSION_TTL_HOURS=168
ADMIN_PASSWORD_RESET_MINUTES=60
APP_BASE_URL=https://your-domain.example
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Solar Savings Advisor <onboarding@resend.dev>"
```

Create a PostgreSQL database resource in the same Coolify project, then connect its internal `DATABASE_URL` to the app. The app creates submission, admin user/session/reset, and ad placement tables on boot.

## Admin Dashboard

The public footer links quietly to `/admin/`, which redirects to:

```text
/admin/leads/
```

Use the configured admin email/password to sign in. The dashboard supports category/status filtering, admin notes, CSV export, password-reset email through Resend, and custom ad snippets for placement IDs.

`ADMIN_TOKEN` remains available for authenticated API automation through the `Authorization: Bearer <token>` header.

## Production CMS Authentication

Coolify static hosting does not automatically provide Git Gateway authentication. If a Git-based content CMS is reintroduced later, production CMS publishing requires one of:

- Netlify Identity plus Netlify Git Gateway
- Decap GitHub backend with a GitHub OAuth app/proxy
- Decap GitLab backend with GitLab OAuth
- Decap Bitbucket backend with Bitbucket OAuth
- A compatible self-hosted OAuth/auth proxy

The production `/admin/` path is reserved for the app-owned dashboard redirect. If Decap is needed later, expose it on a separate path such as `/admin/cms/` with a configured OAuth backend.

## Data Safety Notes

Lead capture posts to `/api/submissions` and stores records in PostgreSQL when `DATABASE_URL` is configured. Keep consent language, privacy coverage, spam prevention, and retention/export practices aligned with production use.

`/admin/` and `/admin/leads/` are excluded from indexing by page-level robots meta and `robots.txt`.

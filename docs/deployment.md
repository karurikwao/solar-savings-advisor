# Deployment

This project builds the Astro public website and serves it with a small Node.js runtime for submission capture and admin exports.

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
```

Optional environment variables:

```text
DATABASE_SSL=false
DATABASE_POOL_SIZE=5
```

Create a PostgreSQL database resource in the same Coolify project, then connect its internal `DATABASE_URL` to the app. The app creates the `app_submissions` table on boot.

## Submission Admin

Saved quote follow-ups, solar reports, and calculator runs are available at:

```text
/admin/leads/
```

Use `ADMIN_TOKEN` to load records. The dashboard supports category/status filtering, admin notes, and CSV export.

## Decap CMS Local Editing

`local_backend: true` is enabled in:

```text
public/admin/config.yml
```

Run two terminals from the project root:

```bash
npm run dev
```

```bash
npx decap-server
```

Open:

```text
http://localhost:4321/admin/
```

Local Decap editing writes directly to repository files.

## Production CMS Authentication

Coolify static hosting does not automatically provide Git Gateway authentication. Production CMS publishing requires one of:

- Netlify Identity plus Netlify Git Gateway
- Decap GitHub backend with a GitHub OAuth app/proxy
- Decap GitLab backend with GitLab OAuth
- Decap Bitbucket backend with Bitbucket OAuth
- A compatible self-hosted OAuth/auth proxy

Without one of these, `/admin/` can load, but login/publishing will not work in production.

## Data Safety Notes

Lead capture posts to `/api/submissions` and stores records in PostgreSQL when `DATABASE_URL` is configured. Keep consent language, privacy coverage, spam prevention, and retention/export practices aligned with production use.

`/admin/` and `/admin/leads/` are excluded from indexing by page-level robots meta and `robots.txt`.

# Deployment

This project builds a fully static public website.

## Build

```bash
npm run build
```

Output:

```text
dist/
```

No Node.js server is required at runtime.

## Coolify

Use:

```text
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

Deploy as a static site.

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

## Static Safety Notes

Lead capture is a frontend placeholder unless an endpoint is configured. Add spam prevention, consent handling, privacy coverage, and provider terms before sending real leads to a webhook, CRM, or form service.

`/admin/` is excluded from indexing by page-level robots meta and `robots.txt`.

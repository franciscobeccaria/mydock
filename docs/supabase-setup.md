# Supabase setup

## Remote project

A remote Supabase project was created for this repo via MCP:

- Project name: `mydock-dev`
- Project ref / id: `agsyimfsnoocnrvvfbxt`
- Region: `us-east-1`

## Required env vars

Copy `.env.example` to `.env.local` and fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Optional / later:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_*`
- `LINEAR_*`
- `TOKEN_ENCRYPTION_SECRET`

## Local CLI workflow

1. Install the Supabase CLI.
2. Start local services:

```bash
pnpm supabase:start
```

3. Reset to current migrations:

```bash
pnpm supabase:reset
```

4. Generate TS types if you are using the local stack:

```bash
pnpm supabase:types
```

## Auth settings to configure in Supabase Dashboard

For email magic links and callback redirects, ensure the Supabase Auth URL configuration includes:

- Site URL: `http://localhost:3000`
- Additional redirect URLs:
  - `http://localhost:3000/**`
  - `https://*-<your-vercel-team>.vercel.app/**`

## Notes

- The app uses `@supabase/ssr` with cookie-based sessions.
- `integration_tokens` is intentionally server-only and prepared for encrypted storage.

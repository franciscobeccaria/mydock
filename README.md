# MyDock

MyDock is a desktop-first productivity dashboard that brings Linear, Gmail, Google Tasks, and Google Calendar into one clean workspace.

## MVP scope

- Next.js App Router single app
- shadcn/ui dashboard
- Supabase cloud auth with magic links
- mock-first widgets for provider data
- Google + Linear OAuth/server adapters scaffolded for later
- Supabase migrations + RLS included

## Tech stack

- Next.js 16
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Supabase Auth + Postgres
- `@supabase/ssr`
- TanStack Query
- Zod
- date-fns
- Lucide React
- pnpm

## Local setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000/login`.

## Run without provider credentials

The app still works before Google or Linear OAuth is configured:

- authentication uses Supabase only
- widgets render mock data
- integration callbacks fail gracefully with clear missing-env responses

## Connect Supabase

1. Create or reuse a Supabase project.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to `.env.local`.
3. Make sure Auth URL Configuration allows `http://localhost:3000/**`.

See `docs/supabase-setup.md`.

## Migrations

Local CLI flow:

```bash
pnpm supabase:start
pnpm supabase:reset
pnpm supabase:types
```

Migrations live in `supabase/migrations`.

## Google OAuth later

Fill:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

Then complete the server-side code exchange in `src/app/api/integrations/google/callback/route.ts`.

## Linear OAuth later

Fill:

- `LINEAR_CLIENT_ID`
- `LINEAR_CLIENT_SECRET`
- `LINEAR_REDIRECT_URI`

Then complete the exchange in `src/app/api/integrations/linear/callback/route.ts`.

## Deploy to Vercel

- set public Supabase env vars
- set `NEXT_PUBLIC_APP_URL`
- allow Vercel preview URLs in Supabase redirects

See `docs/vercel-deploy.md`.

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm format
pnpm supabase:start
pnpm supabase:stop
pnpm supabase:reset
pnpm supabase:types
```

## Known limitations / next steps

- provider OAuth callbacks are scaffolded, not completed
- mock widgets are the default data source
- token encryption is documented but not yet activated
- widget cache is modeled in SQL but not yet used as the runtime source of truth

# MyDock

MyDock is a desktop-first productivity dashboard that brings Gmail, Google Calendar, Google Tasks, and Linear into one calm workspace.

## Current product state

- Google-first sign-in with Supabase Auth
- Real Google integrations for:
  - Gmail
  - Google Calendar
  - Google Tasks
- Linear integration scaffolded, but not yet live
- Desktop-first dashboard built with shadcn/ui
- Supabase schema, auth, and RLS already set up
- Production deployment is live on Vercel at `https://mydock-teal.vercel.app`

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

Open:

```txt
http://localhost:3000/login
```

Before running locally, make sure `.env.local` contains the real Supabase and Google values. Avoid overwriting it with `vercel env pull` unless you intend to rebuild the local file afterward.

## Required env vars

### App + Supabase

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TOKEN_ENCRYPTION_SECRET=
```

### Google

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
```

### Linear

```bash
LINEAR_CLIENT_ID=
LINEAR_CLIENT_SECRET=
LINEAR_REDIRECT_URI=http://localhost:3000/api/integrations/linear/callback
```

## Auth and integrations

### Google

Google sign-in is the primary login flow.

The app currently uses Google OAuth to:
- sign users in
- request Gmail, Calendar, and Tasks permissions
- store Google account tokens server-side
- fetch real widget data from Google APIs

The hosted app is working in both local and production environments. The current implementation persists Google account data server-side and also keeps a secure cookie fallback so the dashboard can continue loading widgets if the server-only account record is temporarily unavailable.

### Linear

Linear is still a separate integration.

The UI and provider scaffolding exist, but the live OAuth exchange and real data fetching are not finished yet.

## Database and migrations

Migrations live in:

```txt
supabase/migrations
```

Useful scripts:

```bash
pnpm supabase:start
pnpm supabase:stop
pnpm supabase:reset
pnpm supabase:types
```

## Main scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm format
```

## Project structure highlights

- `src/app/(auth)/login/page.tsx` — Google-first login screen
- `src/app/auth/callback/route.ts` — Supabase OAuth callback handling
- `src/features/integrations/providers/google/account.ts` — Google account/token sync
- `src/features/integrations/providers/google/client.ts` — server-side Google API client + token refresh
- `src/features/integrations/providers/google/*.adapter.ts` — Gmail / Tasks / Calendar adapters
- `src/features/integrations/providers/linear/*` — Linear scaffolding
- `src/components/widgets/*` — dashboard widgets
- `src/components/integrations/*` — integrations settings UI

## Deploy to Vercel

- set all required Supabase env vars
- set Google env vars
- set `NEXT_PUBLIC_APP_URL`
- configure Supabase redirect URLs for your deployed domain
- configure Google OAuth authorized origins and redirect URLs
- keep `framework` set to `nextjs` (see `vercel.json`)

See `docs/vercel-deploy.md`.

## Next steps

- Connect and test the live Linear integration
- Replace Linear mock data with real GraphQL data
- Move Linear from scaffolded OAuth to a real end-to-end connection flow
- Iterate and improve the dashboard UI/UX after Linear is live
- Refine widget density, hierarchy, spacing, and states
- Improve integrations settings UX and connection feedback
- Add disconnect/reconnect management flows
- Add caching/sync strategy for external providers
- Prepare production hardening for Google scope verification

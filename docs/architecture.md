# MyDock architecture

## Overview

MyDock is a single Next.js App Router application with a desktop-first dashboard and a minimal route surface:

- `/login`
- `/auth/callback`
- `/dashboard`
- `/settings/integrations`
- internal API routes under `/api/*`

## App layers

### UI layer

- shadcn/ui is the primary primitive library.
- TanStack Query drives client-side dashboard refresh and widget loading states.
- Widgets are normalized so every provider can render the same state machine: `loading`, `empty`, `error`, `not_connected`, `connected`.

### Auth layer

- Supabase Auth is wired through `@supabase/ssr`.
- `src/proxy.ts` protects `/dashboard` and `/settings/*`.
- Server components and route handlers use `createServerClient`; browser code uses `createBrowserClient`.

### Integration layer

- Adapters live under `src/features/integrations`.
- Each provider returns normalized `WidgetItem[]` data.
- Today Summary is deterministic and compositional so an LLM provider can be added later without reshaping the UI.

### Data layer

- Supabase Postgres stores profiles, provider connection state, token placeholders, and widget cache rows.
- RLS is enabled on all user-owned tables.
- `integration_tokens` intentionally has no client-facing select policy.

## MCP usage

- **Context7** was used to confirm current Next.js 16 proxy/redirect and TanStack Query provider patterns.
- **shadcn MCP** initialized the project and installed the required UI components from the official registry.
- **Supabase MCP** created the remote project and is used to apply/verify the database schema remotely.

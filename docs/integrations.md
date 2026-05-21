# Integrations

## Current state

Current provider state:

- Gmail — live
- Google Tasks — live
- Google Calendar — live
- Linear — scaffolded, not live yet

Google now runs through the real hosted and local OAuth flow, stores provider access server-side, and fetches real widget data from Google APIs. Linear still uses scaffolded OAuth start logic and mock widget data.

## Google model

Google uses one shared OAuth flow in this architecture.

Today, the Google callback:

1. exchanges the authorization code through Supabase Auth
2. syncs provider account state for the signed-in user
3. upserts three `integrations` rows for the current user:
   - `gmail`
   - `google_tasks`
   - `google_calendar`
4. loads widget data from the Gmail, Google Tasks, and Google Calendar APIs

## Scope guidance

### Gmail

- MVP target: readonly / metadata-style access only
- Avoid storing raw email bodies in the database
- Public launch may require Google verification depending on scopes and publishing mode

### Google Calendar

- MVP target: readonly event scopes only

### Google Tasks

- MVP target: readonly scope only

### Linear

- OAuth and GraphQL reads remain scaffolded in code
- Token handling must remain server-only
- The current callback route still redirects to `linear-unavailable`
- The current adapter still returns mock items

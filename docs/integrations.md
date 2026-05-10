# Integrations

## Current state

The MVP is mock-first for provider data:

- Linear
- Gmail
- Google Tasks
- Google Calendar

The dashboard renders realistic mock items immediately after authentication, while the real OAuth/token exchange flows remain scaffolded behind server routes.

## Google model

Google uses one shared OAuth flow in this architecture.

When fully implemented, the callback should:

1. exchange the authorization code server-side
2. persist encrypted tokens in `integration_tokens`
3. upsert three `integrations` rows for the current user:
   - `gmail`
   - `google_tasks`
   - `google_calendar`

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

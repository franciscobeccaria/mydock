# Vercel deploy notes

## Environment variables

Set the following in Vercel:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- optional provider env vars for Google and Linear

## Supabase redirect URLs

In Supabase Auth URL Configuration, allow:

- production domain
- `https://*-<your-vercel-team>.vercel.app/**`
- `http://localhost:3000/**`

## Deploy flow

```bash
pnpm build
```

Then connect the repo to Vercel and mirror the production env vars there.

## Known limitation

Provider widgets stay mock-backed until Google and Linear OAuth credentials are configured and their callback routes are completed.

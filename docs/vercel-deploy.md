# Vercel deploy notes

## Current production

- Production alias: `https://mydock-teal.vercel.app`
- The repo includes `vercel.json` with `framework: "nextjs"` so Vercel does not treat the project as a generic app.

## Environment variables

Set the following in Vercel:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TOKEN_ENCRYPTION_SECRET`
- Google env vars:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`
- optional Linear env vars:
  - `LINEAR_CLIENT_ID`
  - `LINEAR_CLIENT_SECRET`
  - `LINEAR_REDIRECT_URI`

## Supabase redirect URLs

In Supabase Auth URL Configuration, allow:

- `https://mydock-teal.vercel.app/**`
- `https://*-fbeccaria24gmailcoms-projects.vercel.app/**`
- `http://localhost:3000/**`

Set the Supabase Site URL to:

```txt
https://mydock-teal.vercel.app
```

If Google sign-in succeeds but sends the user back to `http://localhost:3000`, the first thing to check is this Supabase URL Configuration.

## Google OAuth notes

For Supabase social login, the Google OAuth app must allow the Supabase callback:

```txt
https://agsyimfsnoocnrvvfbxt.supabase.co/auth/v1/callback
```

Your app redirect after authentication should still point back to MyDock, for example:

```txt
https://mydock-teal.vercel.app/auth/callback?next=%2Fdashboard
```

## Deploy flow

```bash
pnpm build
```

Then deploy with Vercel and mirror the working production env vars there:

```bash
vercel
vercel --prod
```

## Known limitation

- Google widgets are live in local and hosted environments.
- Linear remains scaffolded until its OAuth callback and data adapter are implemented.

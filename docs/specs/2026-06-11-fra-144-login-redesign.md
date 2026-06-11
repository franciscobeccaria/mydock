# FRA-144 — Redesign the login page UI/UX

## Context

[FRA-144](https://linear.app/francisco-beccaria/issue/FRA-144/redesign-the-login-page-uiux). The login page (`src/app/(auth)/login/page.tsx`) is a dated two-column marketing layout that sells the three Google tools three times over (left feature cards, in-form permission cards, "What you'll see first" box). Flagged during FRA-138 / FRA-143.

**Design:** created in this workflow (lane: GPT/Images → converged on a mega-simple direction; ASCII shape captured on the Linear issue). The value-prop messaging moves to a future landing page — [FRA-146](https://linear.app/francisco-beccaria/issue/FRA-146/build-a-marketinglanding-page) (deferred).

## Goal

A friction-free, centered single-column login: the MyDock logo + the "Continue with Google" button, and nothing else.

## Scope

- Rewrite `src/app/(auth)/login/page.tsx` to a centered single-column layout: MyDock logo, then the Google sign-in button (+ existing states).
- Reuse the app's existing brand mark (the `M` `bg-primary` rounded square + "MyDock" wordmark from `app-sidebar.tsx`).
- Inline the button + auth states into the page and **delete** `src/components/auth/login-form.tsx` (its only importer is this page).

## Out of scope

- Auth logic / OAuth flow (unchanged — same `/api/integrations/google/start?next=/dashboard` link).
- The value-prop/marketing messaging (→ FRA-146).
- Connections screen / multi-account (FRA-138); app-shell nav (FRA-143).

## Acceptance criteria

- [ ] Login is a centered, single-column layout containing only the MyDock logo and the "Continue with Google" button.
- [ ] The logo reuses the existing app mark (`M` square + "MyDock" wordmark) — no new asset.
- [ ] The button keeps current behavior: same link/flow when configured; disabled when Supabase isn't configured.
- [ ] All marketing furniture removed: value-prop badge, headline/subhead, 3 feature cards, 3 permission-highlight cards, "What you'll see first" box.
- [ ] Error message still renders for `auth-failed` / `auth-unavailable` reasons.

## Test cases / test intent

- typecheck/build: no dangling `LoginForm` import after deletion.
- agent-browser (real app, logged out): `/login` shows only logo + button, centered; clicking starts the Google flow.
- agent-browser: `/login?reason=auth-failed` renders the error message above/near the button.

## Plan

1. Rewrite `login/page.tsx`: keep the server-side `getUser` redirect and `searchParams` reason→message logic; replace the JSX body with a centered column (logo mark + button + conditional Alert states). Drop `PageContainer`/`Badge`/`Card`/feature-list imports.
2. Delete `src/components/auth/login-form.tsx`.
3. Verify.

## Verification

- `pnpm lint && pnpm typecheck && pnpm build`
- agent-browser logged-out pass on `/login` and `/login?reason=auth-failed`, screenshots for the manual-QA checkpoint.

## Risks / open questions

- None significant. The brand mark is currently inline JSX in the sidebar (not a shared component); I'll replicate the same markup rather than extract a component (out of scope to refactor the sidebar).

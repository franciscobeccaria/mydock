@AGENTS.md

# Harness

This project runs on the harness defined in `docs/harness.md` — read it before starting any meaningful work.

The short version:

- **Meaningful change → one spec first**: copy `docs/specs/_template.md` to `docs/specs/YYYY-MM-DD-fra-xxx-<slug>.md` and fill it. Trivial fixes don't need one.
- **Route by design status first**: design exists → build to it; not needed (backend/logic) → straight to spec; needed but missing → create it as a workflow stage with `/idea-to-feature` (lanes: in-app mock, ASCII, image gen) before writing the spec. See "Design routing" in `docs/harness.md`.
- **Migrations/upgrades** (Next.js/React majors, Supabase breaking changes): research first, use the migration-plan template linked from `docs/harness.md`.
- **Verify before PR**: `pnpm lint && pnpm typecheck && pnpm build`, then prove the acceptance criteria in the real app with agent-browser (auth recipe linked in `docs/harness.md`).
- **PR mirrors the spec** — the template in `.github/pull_request_template.md` does this; fill it with evidence, not promises.
- **Guardrails**: ticket-named branches, never commit to `main` directly, RLS stays on, secrets never in code.

Architecture context: `docs/architecture.md` · integrations: `docs/integrations.md` · Supabase: `docs/supabase-setup.md`.

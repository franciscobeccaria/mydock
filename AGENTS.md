<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Harness

This project runs on the harness defined in `docs/harness.md` — read it before starting any meaningful work. These directives are agent-agnostic; agent-specific capabilities (memory, skills) are layered in each agent's own file (e.g. `CLAUDE.md`).

The harness is **self-contained**: skills and commands it depends on are vendored in `.claude/` (`skills/idea-to-feature`, `commands/commit-message`), so cloning this repo on any machine brings the full harness. If the harness references a component, it must live in the repo.

- **Starting a ticket → gather context first, without being asked**:
  1. Fetch the issue (FRA-xxx) from Linear — description, relations, attachments/design status.
  2. If your agent has a persistent memory tool, search it for prior work on the area.
  3. `gh` CLI: recent merged PRs and commit history touching the relevant surfaces.
  4. Read any related specs in `docs/specs/`.
- **Meaningful change → one spec first**: copy `docs/specs/_template.md` to `docs/specs/YYYY-MM-DD-fra-xxx-<slug>.md` and fill it. Trivial fixes don't need one.
- **Route by design status first**: design exists → build to it; not needed (backend/logic) → straight to spec; needed but missing → create the design as a workflow stage by iterating a mock through a lane (in-app code mock first, then ASCII wireframe, then image generation) and getting it approved before writing the spec. See "Design routing" in `docs/harness.md`.
- **Migrations/upgrades** (Next.js/React majors, Supabase breaking changes): research first, use the migration-plan template linked from `docs/harness.md`.
- **Verify before PR**: `pnpm lint && pnpm typecheck && pnpm build`, then gather acceptance-criteria evidence in the real app with agent-browser (auth recipe linked in `docs/harness.md`). agent-browser is for *evidence*, not for replacing QA — never start automated browser QA beyond that unprompted.
- **Manual QA checkpoint (UI-visible changes)**: after verification, STOP before the PR. Prepare the handoff — dev server running, authenticated agent-browser session if useful, and a short list of what to check. Francisco does the manual QA; his "go/done" releases the PR. Backend/logic-only changes can skip this checkpoint.
- **Commits**: Conventional Commits with scope and ticket suffix — `feat(connections): … (FRA-138)` — in English, title ≤50 chars, body lines ≤72. Group by user-facing functionality first, technical notes in the body. The `/commit-message` command (vendored in `.claude/commands/`) generates these. **Never include AI attribution** — no "Generated with Claude", no tool Co-Authored-By trailers — in commits, PR descriptions, or comments.
- **PR mirrors the spec** — the template in `.github/pull_request_template.md` does this; fill it with evidence, not promises.
- **Guardrails**: ticket-named branches, never commit to `main` directly, RLS stays on, secrets never in code, no AI attribution anywhere.

Architecture context: `docs/architecture.md` · integrations: `docs/integrations.md` · Supabase: `docs/supabase-setup.md`.

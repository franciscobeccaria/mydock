# MyDock harness

**v1 — frozen 2026-06-11.** Updates come from two sources: friction observed on real tickets (see Iteration rule), and options pulled from the [harness-library](https://github.com/franciscobeccaria/harness-library) docs and [catalog](https://github.com/franciscobeccaria/harness-library/blob/master/catalog/README.md).

MyDock's instantiation of the shared journey from [harness-library](https://github.com/franciscobeccaria/harness-library). This is the **personal reference harness**: lighter than client work, but with real specs, real verification, and PR discipline.

> Library = the menu ([harness-library](https://github.com/franciscobeccaria/harness-library)). Harness = this file: what MyDock actually loads, and how strict each stage is here.

## Journey instantiation

| Stage | MyDock intensity | How |
|-------|-----------------|-----|
| 0. Product input | normal | Linear ticket (FRA-xxx) or direct idea; check design status (see Design routing) |
| 1. Framing | normal | classify: feature / bug / migration / UI-heavy; route by design status; decide if research is needed |
| 2. Research | **only when uncertainty exists** | Context7, official docs, web. Mandatory for upgrades (Next.js majors, Supabase changes) |
| 3. Spec | normal | one spec file (see Artifacts) — no multi-file ceremony |
| 4. Planning | light | plan lives inside the spec |
| 5. Build | normal | feature branch named after the ticket, conventional commits with `(FRA-xxx)` |
| 6. Verification | **strong** | see Verification stack |
| 6b. Manual QA checkpoint | UI-visible changes | agent prepares the handoff (running app, authed session, what-to-check list) and STOPS; Francisco's "go" releases the PR — TD Bank checkpoint pattern, agent-browser-assisted |
| 7. PR | normal | PR description mirrors the spec (`.github/pull_request_template.md`); commits via `/commit-message`, no AI attribution |
| 8. Post-PR | light | CI green + self-review; no corporate review loops |

## Design routing

Every issue gets classified by design status during framing — this decides whether a design stage runs before the spec:

| Case | Route |
|------|-------|
| **Needs design, design exists** (Figma / Linear attachment) | Build to the design. Link it in the spec's Context and note confirmed vs partial. |
| **No design needed** (backend, data model, refactor, infra, pure logic) | Skip straight to spec. Say so explicitly in Context ("Design: not needed"). |
| **Needs design, none exists** | **Design creation becomes a workflow stage.** Run `/idea-to-feature` to iterate the UI through a lane — terminal ASCII, in-app code mock, GPT Images, or Stitch — picking the lane by fidelity needed. The chosen mock becomes the design reference linked in the spec, and acceptance criteria follow the idea only (no invented ACs). |

FRA-138 validated the third route (ASCII + in-app mock → tickets → build). Default lane order for MyDock: in-app code mock first (it's a real app and the mock often becomes the implementation), ASCII for quick structure, image generation only when visual exploration matters.

## Artifacts

- **One spec per meaningful change:** `docs/specs/YYYY-MM-DD-<ticket>-<slug>.md`, from [`docs/specs/_template.md`](./specs/_template.md).
- **Migrations/upgrades** (Next.js major, React major, Supabase breaking change): use the [migration-plan template](https://github.com/franciscobeccaria/harness-library/blob/master/templates/migration-plan.md) instead — copy it in on demand.
- **PR description is the results surface.** No `results.md` unless a durable handoff genuinely matters (rare here).
- Legacy superpowers-era artifacts stay in `docs/superpowers/` — don't add new ones there.

## Verification stack

Run before every PR:

```sh
pnpm lint && pnpm typecheck && pnpm build
```

- **agent-browser** is the default for verifying changes in the real authed app. Auth recipe (Supabase session mint + cookie injection, base-ui Select gotcha): [harness-library catalog → Recipes](https://github.com/franciscobeccaria/harness-library/blob/master/catalog/README.md#recipes--harness-how-tos-worth-keeping).
- **Chrome DevTools MCP** for interactive debugging only.
- Supabase changes: verify against local stack (`pnpm supabase:start` / `supabase:reset`); regenerate types with `pnpm supabase:types`.
- Manual QA checkpoint: default for UI-visible changes, skippable for backend/logic-only work. The agent never runs automated browser QA unprompted — agent-browser gathers evidence and preps the authed session, then the agent stops and waits for Francisco's manual pass and "go" before the PR.

## Guardrails (medium)

- Never commit to `main` directly; ticket-named branches.
- RLS on all user-owned tables is non-negotiable; `integration_tokens` never gets a client-facing select policy (see [architecture](./architecture.md)).
- Secrets stay in `.env.local` / Vercel env — never in code or specs.
- Read `node_modules/next/dist/docs/` before writing Next.js-API code (this Next version differs from training data — see `AGENTS.md`).

## Base components always on

Engram memory · Context7 · shadcn MCP · `gh` CLI · Linear · Vercel CLI · agent-browser.

These are not just available — stage 0 *uses* them unprompted: Linear MCP fetches the ticket, engram (`mem_search`, project `mydock`) recalls prior work, `gh` pulls recent PRs/commits for the touched surfaces, and related specs in `docs/specs/` get read. Prompts never need to name these tools; naming a tool is reserved for exceptions outside the routine set.

Harness-owned skills/commands are **vendored in `.claude/`** (`skills/idea-to-feature/`, `commands/commit-message.md`) — the repo is the harness's single source. Never depend on machine-local `~/.claude` for harness behavior; if the harness references a component, copy it into the repo.

## Iteration rule

When a stage of this harness causes friction or gets skipped repeatedly on real tickets, change **this file** — and if the lesson generalizes, push it upstream to harness-library.

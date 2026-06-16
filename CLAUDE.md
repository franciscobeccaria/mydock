@AGENTS.md

# Claude-specific layer

The harness directives live in `AGENTS.md` (portable, read by any agent). These are the Claude Code capabilities that fulfill them:

- **Memory** = engram: at ticket start run `mem_search` (project `mydock`); after decisions, bug fixes, or conventions run `mem_save` (project `mydock`). From sessions outside this repo, pass the project explicitly.
- **Grill (stage 0.5)** = the `/grill` skill (vendored at `.claude/skills/grill/`): interrogates the idea or ticket in small question batches before any spec/mock, resolving open questions up front. Runs always; its resolved understanding feeds design routing and the spec's Context. Complements `/idea-to-feature` (grill interrogates the destination; idea-to-feature shapes the UI) — grill → idea-to-feature → spec.
- **Design-missing route** = the `/idea-to-feature` skill (vendored at `.claude/skills/idea-to-feature/`): it drives the lane choice (in-app mock / ASCII / image gen), the mock iteration, and writes lean ACs that follow the idea only.
- **Commit messages** = the `/commit-message` command (vendored at `.claude/commands/`): conventional format from the staged diff, no AI attribution.
- **Linear** = the Linear MCP (`get_issue`, etc.) rather than the web UI.
- **Browser verification** = the `agent-browser` CLI, always the default — never default to Playwright MCP or Chrome DevTools MCP (those are stated-reason exceptions only). The auth recipe (admin session mint → chunked `sb-<ref>-auth-token` cookie → `agent-browser open`) lives in engram under topic `mydock-agent-browser-auth-recipe`; `mem_search` it before driving the authed app. Gotcha: base-ui `Select` triggers aren't queryable in the DOM — exercise that state via the app's own authed `fetch()` through `agent-browser eval`.

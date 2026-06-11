@AGENTS.md

# Claude-specific layer

The harness directives live in `AGENTS.md` (portable, read by any agent). These are the Claude Code capabilities that fulfill them:

- **Memory** = engram: at ticket start run `mem_search` (project `mydock`); after decisions, bug fixes, or conventions run `mem_save` (project `mydock`). From sessions outside this repo, pass the project explicitly.
- **Design-missing route** = the `/idea-to-feature` skill (vendored at `.claude/skills/idea-to-feature/`): it drives the lane choice (in-app mock / ASCII / image gen), the mock iteration, and writes lean ACs that follow the idea only.
- **Commit messages** = the `/commit-message` command (vendored at `.claude/commands/`): conventional format from the staged diff, no AI attribution.
- **Linear** = the Linear MCP (`get_issue`, etc.) rather than the web UI.

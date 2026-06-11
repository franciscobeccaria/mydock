# Generate Git Commit Message

Generate a complete git commit message for the staged changes, analyzing each file and providing a comprehensive description.

## Instructions

1. Run `git status` and `git diff --staged` to see all staged changes
2. Analyze the changes file by file to understand what was modified
3. Create a structured commit message with:
   - Conventional commit format (feat:, fix:, refactor:, etc.)
   - Brief summary of the overall change
   - Bullet points describing changes in each affected file
   - Clear explanation of the purpose/impact

## Requirements

- Follow conventional commit format
- Be specific about file-level changes
- Do not add co-authored attribution or "Generated with Claude" messages
- Use active voice and be concise but descriptive
- Include the scope when relevant (e.g., "feat(auth): add login functionality")

## Usage Examples

- `/commit-message` - Generate commit message for all staged changes
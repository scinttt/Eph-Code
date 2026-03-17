Execute a shell command and return its output.

Use this tool to:
- Run build commands (bun install, npm run build, make)
- Execute tests (bun test, npm test, pytest)
- Run git commands (git status, git diff, git log)
- Check system state (ls, pwd, which)
- Run scripts and one-off commands

Guidelines:
- Commands run in a shell (bash) with pipes and redirects supported
- Default timeout is 120 seconds
- Prefer specific, targeted commands over broad ones
- Avoid interactive commands that require user input (vim, less, etc.)
- Do NOT use this tool for reading files (use the read tool) or searching (use grep/glob)
- Do NOT run destructive commands (rm -rf /, drop database, etc.) without explicit user request

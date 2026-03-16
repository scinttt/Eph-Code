Find files by glob pattern in the project.

- Returns matching file paths sorted alphabetically
- Ignores `node_modules/` and `.git/` by default
- Use `path` parameter to search in a specific directory
- Common patterns: `**/*.ts` (all TypeScript files), `src/**/*.test.ts` (all test files)
- Returns "No files matched" if nothing is found
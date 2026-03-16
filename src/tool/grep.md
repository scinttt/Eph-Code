Search file contents using regex patterns.

- Uses ripgrep (`rg`) if available, falls back to system `grep`
- Returns matching lines with file paths and line numbers
- Use `include` parameter to filter by file type (e.g. `*.ts`)
- Use `path` parameter to search in a specific directory
- Supports full regex syntax
- Returns "No matches found" if nothing is found
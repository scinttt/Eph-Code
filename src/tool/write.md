Write content to a file on the filesystem.

- Creates the file and any parent directories if they don't exist
- Overwrites the file completely if it already exists
- Returns a diff showing what changed
- The file path must be an absolute path
- Always read a file before overwriting to avoid losing content
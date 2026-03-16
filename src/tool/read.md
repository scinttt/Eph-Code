Read a file from the filesystem or list a directory's contents.

- Returns file content with line numbers (1-indexed)
- For directories, returns a listing of files and subdirectories
- Supports `offset` and `limit` for reading specific portions of large files
- The file path must be an absolute path
- Default limit is 2000 lines
Replace specific text in a file using search-and-replace.

- `oldString` must match text in the file (exact or close match)
- `newString` is the replacement text (must differ from oldString)
- Use `replaceAll: true` to replace all occurrences; default replaces only one unique match
- If multiple matches exist and `replaceAll` is false, provide more surrounding context to make the match unique
- Returns a diff showing what changed
- To create a new file, use an empty `oldString`
- Supports fuzzy matching: tolerates minor whitespace, indentation, and escape differences
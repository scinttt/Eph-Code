<p align="center">
  <h1 align="center">Eph-Code</h1>
</p>
<p align="center">An open source AI coding agent built with TypeScript + Bun.</p>
<p align="center">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" /></a>
</p>

---

### Overview

Eph-Code is a terminal-based AI coding agent. It provides an interactive CLI for code editing, file operations, and project exploration powered by LLMs.

### Features (Planned)

- Interactive CLI with streaming LLM responses
- Agent loop with tool calling (read, write, edit, glob, grep)
- Multi-provider support (Anthropic, Google, DeepSeek)
- Context compaction for long conversations
- Session persistence with SQLite
- TUI interface

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | TypeScript + Bun |
| LLM | Vercel AI SDK v5 |
| Database | SQLite + Drizzle ORM |
| CLI | yargs + readline |

### License

[MIT](LICENSE)

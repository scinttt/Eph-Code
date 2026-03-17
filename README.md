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

### Features

- Interactive CLI with streaming LLM responses
- Agent loop with manual tool calling (read, write, edit, glob, grep)
- Multi-provider support (Anthropic, Google, DeepSeek)
- 9 fuzzy matching strategies for reliable code editing
- Doom loop detection (cross-message)
- Exponential backoff retry for API errors
- Context compaction for long conversations (prune + LLM summarize)

### Quick Start

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Clone and install
git clone https://github.com/your-repo/eph-code.git
cd eph-code
bun install

# Configure API key (DeepSeek by default)
echo "DEEPSEEK_API_KEY=sk-your-key" > .env

# Run
bun run dev
```

### Usage

```
eph-code> read src/index.ts
eph-code> create a file called hello.ts with console.log("hello")
eph-code> change hello to world in hello.ts
eph-code> find all .ts files
eph-code> search for console.log in the project
eph-code> exit
```

### Switch LLM Provider

Set `EPH_MODEL` environment variable:

```bash
# DeepSeek (default)
EPH_MODEL=deepseek/deepseek-chat bun run dev

# Anthropic
ANTHROPIC_API_KEY=sk-xxx EPH_MODEL=anthropic/claude-sonnet-4-20250514 bun run dev

# Google
GOOGLE_GENERATIVE_AI_API_KEY=xxx EPH_MODEL=google/gemini-2.0-flash bun run dev
```

### License

[MIT](LICENSE)

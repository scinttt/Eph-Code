#!/usr/bin/env bun

import React from "react"
import { render } from "ink"
import { ToolRegistry } from "./tool/registry"
import { ReadTool } from "./tool/read"
import { WriteTool } from "./tool/write"
import { EditTool } from "./tool/edit"
import { GlobTool } from "./tool/glob"
import { GrepTool } from "./tool/grep"
import { InvalidTool } from "./tool/invalid"
import { BashTool } from "./tool/bash"
import { App } from "./tui/app"

if (process.argv.includes("--help")) {
  console.log("eph-code - a coding agent CLI tool")
  console.log()
  console.log("Usage: bun run src/index.ts [options]")
  console.log()
  console.log("Options:")
  console.log("  --help  Show this help message")
  process.exit(0)
}

// Register tools
ToolRegistry.register(ReadTool)
ToolRegistry.register(WriteTool)
ToolRegistry.register(EditTool)
ToolRegistry.register(GlobTool)
ToolRegistry.register(GrepTool)
ToolRegistry.register(BashTool)
ToolRegistry.register(InvalidTool)

// Render TUI — session creation, Bus subscriptions, and Permission handler are inside App
render(React.createElement(App))

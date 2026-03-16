#!/usr/bin/env bun

import * as readline from "readline"
import { Session } from "./session/session"
import { SessionPrompt } from "./session/prompt"
import { SessionProcessor } from "./session/processor"
import { Message } from "./session/message"
import { Identifier } from "./util/id"
import { Bus } from "./bus/bus"
import { ToolRegistry } from "./tool/registry"
import { ReadTool } from "./tool/read"
import { WriteTool } from "./tool/write"
import { EditTool } from "./tool/edit"
import { GlobTool } from "./tool/glob"
import { GrepTool } from "./tool/grep"
import { InvalidTool } from "./tool/invalid"

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
ToolRegistry.register(InvalidTool)

// Subscribe to text deltas for real-time printing
Bus.subscribe(SessionProcessor.TextDelta, (payload) => {
  process.stdout.write(payload.text)
})

// Create session and start CLI
const session = Session.create()
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function prompt() {
  rl.question("eph-code> ", async (input) => {
    const trimmed = input.trim()
    if(!trimmed || trimmed === "exit"){
      rl.close()
      process.exit(0)
    }

    // Create user message and add to session
    const userMsg: Message.Info = {
      id: Identifier.ascending("msg"),
      sessionId: session.id,
      role: "user",
      parts: [{ type: "text", text: trimmed }],
      time: { created: Date.now() },
      metadata: {},
    }
    Session.addMessage(session.id, userMsg)

    try{
      // Run agent loop
      await SessionPrompt.loop(session.id)
    } catch (error) {
      console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`)
    }
    
    console.log()

    prompt()
  })
}

prompt()

#!/usr/bin/env bun

if (process.argv.includes("--help")) {
  console.log("eph-code - a coding agent CLI tool")
  console.log()
  console.log("Usage: bun run src/index.ts [options]")
  console.log()
  console.log("Options:")
  console.log("  --help  Show this help message")
  process.exit(0)
}

console.log("eph-code ready")

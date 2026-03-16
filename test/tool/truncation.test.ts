import { describe, it, expect } from "bun:test"
import { Truncate } from "../../src/tool/truncation"

describe("Truncate.tool_output", () => {
  it("should not truncate short text", () => {
    const text = "hello\nworld"
    expect(Truncate.tool_output(text)).toBe(text)
  })

  it("should truncate text exceeding MAX_LINES (2000)", () => {
    const lines = Array.from({ length: 3000 }, (_, i) => `line ${i}`)
    const text = lines.join("\n")
    const result = Truncate.tool_output(text)
    expect(result).toContain("[truncated: 1000 lines omitted]")
    expect(result.split("\n").length).toBeLessThan(3000)
  })

  it("should truncate text exceeding MAX_BYTES (50KB)", () => {
    const text = "x".repeat(60 * 1024)
    const result = Truncate.tool_output(text)
    expect(result).toContain("[truncated: exceeded 50KB limit]")
  })

  it("should return empty string as is", () => {
    expect(Truncate.tool_output("")).toBe("")
  })
})

import { describe, it, expect } from "bun:test"
import { GlobTool } from "../../src/tool/glob"

describe("GlobTool", () => {
  it("should find .ts files", async () => {
    const result = await GlobTool.execute({
      pattern: "src/**/*.ts", path: process.cwd(),
    }, {} as any)
    expect(result.output).toContain("index.ts")
    expect(result.output).not.toContain("No files matched")
  })

  it("should return no match for invalid pattern", async () => {
    const result = await GlobTool.execute({
      pattern: "**/*.nonexistent", path: process.cwd(),
    }, {} as any)
    expect(result.output).toContain("No files matched")
  })
})

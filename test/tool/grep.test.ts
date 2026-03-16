import { describe, it, expect } from "bun:test"
import { GrepTool } from "../../src/tool/grep"

describe("GrepTool", () => {
  it("should find matches in files", async () => {
    const result = await GrepTool.execute({
      pattern: "export namespace", path: process.cwd(), include: "*.ts",
    }, {} as any)
    expect(result.output).toContain("export namespace")
    expect(result.output).not.toContain("No matches found")
  })

  it("should return no match for nonexistent pattern", async () => {
    const result = await GrepTool.execute({
      pattern: "zzz_nonexistent_pattern_zzz", path: process.cwd(), include: "*.json",
    }, {} as any)
    expect(result.output).toContain("No matches found")
  })
})

import { describe, it, expect, afterEach } from "bun:test"
import { WriteTool } from "../../src/tool/write"
import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"

const tmpDir = path.join(os.tmpdir(), "eph-write-test")

afterEach(async () => {
  try { await fs.rm(tmpDir, { recursive: true }) } catch {}
})

describe("WriteTool", () => {
  it("should create a new file", async () => {
    const filePath = path.join(tmpDir, "hello.ts")
    const result = await WriteTool.execute({ filePath, content: "console.log('hello')" }, {} as any)
    expect(result.output).toContain("File written successfully")
    const content = await fs.readFile(filePath, "utf-8")
    expect(content).toBe("console.log('hello')")
  })

  it("should overwrite an existing file", async () => {
    const filePath = path.join(tmpDir, "overwrite.ts")
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(filePath, "old content")
    const result = await WriteTool.execute({ filePath, content: "new content" }, {} as any)
    expect(result.output).toContain("File written successfully")
    const content = await fs.readFile(filePath, "utf-8")
    expect(content).toBe("new content")
  })

  it("should include diff in output", async () => {
    const filePath = path.join(tmpDir, "diff.ts")
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(filePath, "old")
    const result = await WriteTool.execute({ filePath, content: "new" }, {} as any)
    expect(result.output).toContain("-old")
    expect(result.output).toContain("+new")
  })
})

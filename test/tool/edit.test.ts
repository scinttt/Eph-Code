import { describe, it, expect, afterEach } from "bun:test"
import { EditTool } from "../../src/tool/edit"
import * as fs from "fs/promises"
import * as path from "path"
import * as os from "os"

const tmpDir = path.join(os.tmpdir(), "eph-edit-test")

afterEach(async () => {
  try { await fs.rm(tmpDir, { recursive: true }) } catch {}
})

describe("EditTool", () => {
  it("should replace exact match", async () => {
    const filePath = path.join(tmpDir, "exact.ts")
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(filePath, "const x = 'hello'\n")
    const result = await EditTool.execute({
      filePath, oldString: "hello", newString: "world",
    }, {} as any)
    expect(result.output).toContain("Edit applied successfully")
    const content = await fs.readFile(filePath, "utf-8")
    expect(content).toContain("world")
  })

  it("should match with trimmed whitespace", async () => {
    const filePath = path.join(tmpDir, "trimmed.ts")
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(filePath, "  const x = 1\n  const y = 2\n")
    const result = await EditTool.execute({
      filePath, oldString: "const x = 1\nconst y = 2", newString: "const z = 3",
    }, {} as any)
    expect(result.output).toContain("Edit applied successfully")
  })

  it("should error when oldString not found", async () => {
    const filePath = path.join(tmpDir, "notfound.ts")
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(filePath, "hello world\n")
    const result = await EditTool.execute({
      filePath, oldString: "nonexistent", newString: "replacement",
    }, {} as any)
    expect(result.output).toContain("Error")
  })

  it("should error when oldString equals newString", async () => {
    const filePath = path.join(tmpDir, "same.ts")
    const result = await EditTool.execute({
      filePath, oldString: "same", newString: "same",
    }, {} as any)
    expect(result.output).toContain("identical")
  })

  it("should replaceAll when flag is set", async () => {
    const filePath = path.join(tmpDir, "replaceall.ts")
    await fs.mkdir(tmpDir, { recursive: true })
    await fs.writeFile(filePath, "aaa bbb aaa ccc aaa\n")
    const result = await EditTool.execute({
      filePath, oldString: "aaa", newString: "xxx", replaceAll: true,
    }, {} as any)
    expect(result.output).toContain("Edit applied successfully")
    const content = await fs.readFile(filePath, "utf-8")
    expect(content).toBe("xxx bbb xxx ccc xxx\n")
  })

  it("should create file when oldString is empty", async () => {
    const filePath = path.join(tmpDir, "newfile.ts")
    const result = await EditTool.execute({
      filePath, oldString: "", newString: "new content",
    }, {} as any)
    expect(result.output).toContain("File created successfully")
    const content = await fs.readFile(filePath, "utf-8")
    expect(content).toBe("new content")
  })
})

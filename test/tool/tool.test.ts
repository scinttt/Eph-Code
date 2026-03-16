import { describe, it, expect } from "bun:test"
import { z } from "zod"
import { Tool } from "../../src/tool/tool"

describe("Tool.define", () => {
  const testTool = Tool.define("test", {
    description: "A test tool",
    parameters: z.object({
      input: z.string(),
    }),
    execute: async (args, ctx) => {
      return { title: "test", output: `got: ${args.input}` }
    },
  })

  it("should create tool with correct name", () => {
    expect(testTool.name).toBe("test")
  })

  it("should create tool with correct description", () => {
    expect(testTool.description).toBe("A test tool")
  })

  it("should execute and return output", async () => {
    const result = await testTool.execute({ input: "hello" }, {} as any)
    expect(result.output).toBe("got: hello")
  })

  it("should auto-truncate long output", async () => {
    const longTool = Tool.define("long", {
      description: "Returns long output",
      parameters: z.object({}),
      execute: async () => {
        const lines = Array.from({ length: 3000 }, (_, i) => `line ${i}`)
        return { title: "long", output: lines.join("\n") }
      },
    })
    const result = await longTool.execute({}, {} as any)
    expect(result.output).toContain("[truncated")
  })
})

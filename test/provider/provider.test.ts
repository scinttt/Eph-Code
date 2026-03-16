import { describe, it, expect } from "bun:test"
import { Provider } from "../../src/provider/provider"

describe("Provider.parseModel", () => {
  it("should parse 'anthropic/claude-sonnet-4-20250514'", () => {
    const result = Provider.parseModel("anthropic/claude-sonnet-4-20250514")
    expect(result.provider).toBe("anthropic")
    expect(result.model).toBe("claude-sonnet-4-20250514")
  })

  it("should parse 'deepseek/deepseek-chat'", () => {
    const result = Provider.parseModel("deepseek/deepseek-chat")
    expect(result.provider).toBe("deepseek")
    expect(result.model).toBe("deepseek-chat")
  })

  it("should use default model when no argument", () => {
    const result = Provider.parseModel()
    expect(result.provider).toBe("deepseek")
    expect(result.model).toBe("deepseek-chat")
  })

  it("should handle model with multiple slashes", () => {
    const result = Provider.parseModel("google/gemini-2.0/flash")
    expect(result.provider).toBe("google")
    expect(result.model).toBe("gemini-2.0/flash")
  })
})

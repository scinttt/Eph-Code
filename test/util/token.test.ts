import { describe, it, expect } from "bun:test"
import { Token } from "../../src/util/token"

describe("Token.estimate", () => {
  it("should return 0 for empty string", () => {
    expect(Token.estimate("")).toBe(0)
  })

  it("should estimate 'hello' as 1 token", () => {
    expect(Token.estimate("hello")).toBe(1)
  })

  it("should estimate longer text proportionally", () => {
    const text = "a".repeat(400)
    expect(Token.estimate(text)).toBe(100)
  })
})

import { describe, it, expect } from "bun:test"
import { Identifier } from "../../src/util/id"

describe("Identifier.ascending", () => {
  it("should generate ID with prefix", () => {
    const id = Identifier.ascending("session")
    expect(id.startsWith("session_")).toBe(true)
  })

  it("should generate unique IDs", () => {
    const ids = new Set<string>()
    for (let i = 0; i < 100; i++) {
      ids.add(Identifier.ascending("msg"))
    }
    expect(ids.size).toBe(100)
  })

  it("should generate monotonically ascending IDs", () => {
    const a = Identifier.ascending("test")
    const b = Identifier.ascending("test")
    expect(a < b).toBe(true)
  })
})

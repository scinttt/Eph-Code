import { describe, it, expect } from "bun:test"
import { Session } from "../../src/session/session"
import { Identifier } from "../../src/util/id"

describe("Session", () => {
  it("should create a session with unique id", () => {
    const s = Session.create()
    expect(s.id).toContain("session_")
    expect(s.createdAt).toBeGreaterThan(0)
  })

  it("should get session by id", () => {
    const s = Session.create()
    expect(Session.get(s.id)).toBe(s)
  })

  it("should return undefined for unknown session", () => {
    expect(Session.get("nonexistent")).toBeUndefined()
  })

  it("should add and retrieve messages", () => {
    const s = Session.create()
    const msg = {
      id: Identifier.ascending("msg"), sessionId: s.id, role: "user" as const,
      parts: [{ type: "text" as const, text: "hello" }],
      time: { created: Date.now() }, metadata: {},
    }
    Session.addMessage(s.id, msg)
    const msgs = Session.getMessages(s.id)
    expect(msgs?.length).toBe(1)
    expect(msgs?.[0]?.parts[0]).toEqual({ type: "text", text: "hello" })
  })
})

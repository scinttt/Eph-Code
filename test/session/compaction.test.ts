import { describe, it, expect } from "bun:test"
import { SessionCompaction } from "../../src/session/compaction"
import { Session } from "../../src/session/session"
import { Identifier } from "../../src/util/id"

describe("SessionCompaction.isOverflow", () => {
  it("should return false for short conversation", () => {
    const session = Session.create()
    Session.addMessage(session.id, {
      id: Identifier.ascending("msg"),
      sessionId: session.id,
      role: "user",
      parts: [{ type: "text", text: "hello" }],
      time: { created: Date.now() },
      metadata: {},
    })
    expect(SessionCompaction.isOverflow(session.id)).toBe(false)
  })

  it("should return true for very long conversation", () => {
    const session = Session.create()
    // Add a message with huge tool result (~100K tokens = ~400K chars)
    Session.addMessage(session.id, {
      id: Identifier.ascending("msg"),
      sessionId: session.id,
      role: "assistant",
      parts: [{
        type: "tool",
        toolCallId: "call_1",
        toolName: "read",
        args: {},
        state: "completed" as const,
        result: "x".repeat(400000),
      }],
      time: { created: Date.now() },
      metadata: {},
    })
    expect(SessionCompaction.isOverflow(session.id)).toBe(true)
  })
})

describe("SessionCompaction.prune", () => {
  it("should protect last 2 turns", () => {
    const session = Session.create()
    // Turn 1 (old)
    Session.addMessage(session.id, {
      id: Identifier.ascending("msg"), sessionId: session.id, role: "user",
      parts: [{ type: "text", text: "old question" }],
      time: { created: Date.now() }, metadata: {},
    })
    Session.addMessage(session.id, {
      id: Identifier.ascending("msg"), sessionId: session.id, role: "assistant",
      parts: [{ type: "tool", toolCallId: "c1", toolName: "read", args: {},
        state: "completed" as const, result: "old result ".repeat(5000) }],
      time: { created: Date.now() }, metadata: {},
    })
    // Turn 2 (recent)
    Session.addMessage(session.id, {
      id: Identifier.ascending("msg"), sessionId: session.id, role: "user",
      parts: [{ type: "text", text: "recent question" }],
      time: { created: Date.now() }, metadata: {},
    })
    Session.addMessage(session.id, {
      id: Identifier.ascending("msg"), sessionId: session.id, role: "assistant",
      parts: [{ type: "tool", toolCallId: "c2", toolName: "read", args: {},
        state: "completed" as const, result: "recent result" }],
      time: { created: Date.now() }, metadata: {},
    })

    SessionCompaction.prune(session.id)
    const msgs = Session.getMessages(session.id)!
    // Recent turn's tool result should be preserved
    const recentTool = msgs[3]!.parts[0]
    expect(recentTool!.type === "tool" && recentTool.result).not.toBe("[compacted]")
  })
})

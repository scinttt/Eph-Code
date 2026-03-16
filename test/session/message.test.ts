import { describe, it, expect } from "bun:test"
import { Message } from "../../src/session/message"

describe("Message.toModelMessages", () => {
  it("should convert user message", () => {
    const msgs: Message.Info[] = [{
      id: "msg_1", sessionId: "s1", role: "user",
      parts: [{ type: "text", text: "hello" }],
      time: { created: 0 }, metadata: {},
    }]
    const result = Message.toModelMessages(msgs)
    expect(result).toEqual([{ role: "user", content: "hello" }])
  })

  it("should convert assistant text message", () => {
    const msgs: Message.Info[] = [{
      id: "msg_1", sessionId: "s1", role: "assistant",
      parts: [{ type: "text", text: "hi there" }],
      time: { created: 0 }, metadata: {},
    }]
    const result = Message.toModelMessages(msgs)
    expect(result[0]!.role).toBe("assistant")
    expect(result[0]!.content[0].type).toBe("text")
  })

  it("should convert tool call + result to assistant + tool messages", () => {
    const msgs: Message.Info[] = [{
      id: "msg_1", sessionId: "s1", role: "assistant",
      parts: [{
        type: "tool", toolCallId: "c1", toolName: "read",
        args: { filePath: "test.ts" }, state: "completed", result: "file content",
      }],
      time: { created: 0 }, metadata: {},
    }]
    const result = Message.toModelMessages(msgs)
    expect(result.length).toBe(2)
    expect(result[0]!.role).toBe("assistant")
    expect(result[0]!.content[0].type).toBe("tool-call")
    expect(result[0]!.content[0].input).toEqual({ filePath: "test.ts" })
    expect(result[1]!.role).toBe("tool")
    expect(result[1]!.content[0].output).toEqual({ type: "text", value: "file content" })
  })

  it("should convert reasoning part with text field", () => {
    const msgs: Message.Info[] = [{
      id: "msg_1", sessionId: "s1", role: "assistant",
      parts: [{ type: "reasoning", reasoning: "thinking..." }],
      time: { created: 0 }, metadata: {},
    }]
    const result = Message.toModelMessages(msgs)
    expect(result[0]!.content[0].type).toBe("reasoning")
    expect(result[0]!.content[0].text).toBe("thinking...")
  })

  it("should skip pending tool parts from tool results", () => {
    const msgs: Message.Info[] = [{
      id: "msg_1", sessionId: "s1", role: "assistant",
      parts: [{
        type: "tool", toolCallId: "c1", toolName: "read",
        args: {}, state: "pending",
      }],
      time: { created: 0 }, metadata: {},
    }]
    const result = Message.toModelMessages(msgs)
    expect(result.length).toBe(1) // only assistant, no tool result message
    expect(result[0]!.content[0].type).toBe("tool-call")
  })
})

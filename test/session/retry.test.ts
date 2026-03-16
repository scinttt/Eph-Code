import { describe, it, expect } from "bun:test"
import { SessionRetry } from "../../src/session/retry"

describe("SessionRetry.retryable", () => {
  it("should return true for 429 error", () => {
    expect(SessionRetry.retryable(new Error("429 Too Many Requests"))).toBe(true)
  })

  it("should return true for rate limit error", () => {
    expect(SessionRetry.retryable(new Error("rate limit exceeded"))).toBe(true)
  })

  it("should return true for 503 error", () => {
    expect(SessionRetry.retryable(new Error("503 Service Unavailable"))).toBe(true)
  })

  it("should return true for network error", () => {
    expect(SessionRetry.retryable(new Error("fetch failed"))).toBe(true)
  })

  it("should return false for non-retryable error", () => {
    expect(SessionRetry.retryable(new Error("Invalid API key"))).toBe(false)
  })

  it("should return false for non-Error", () => {
    expect(SessionRetry.retryable("some string")).toBe(false)
  })
})

describe("SessionRetry.delay", () => {
  it("should return 2s for attempt 0", () => {
    expect(SessionRetry.delay(0)).toBe(2000)
  })

  it("should return 4s for attempt 1", () => {
    expect(SessionRetry.delay(1)).toBe(4000)
  })

  it("should return 8s for attempt 2", () => {
    expect(SessionRetry.delay(2)).toBe(8000)
  })

  it("should cap at 30s", () => {
    expect(SessionRetry.delay(10)).toBe(30000)
  })

  it("should respect retry-after header", () => {
    const error = { responseHeaders: { "retry-after": "5" } }
    expect(SessionRetry.delay(0, error)).toBe(5000)
  })
})

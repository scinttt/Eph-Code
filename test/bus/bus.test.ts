import { describe, it, expect } from "bun:test"
import { z } from "zod"
import { Bus } from "../../src/bus/bus"
import { BusEvent } from "../../src/bus/event"

describe("Bus", () => {
  const TestEvent = BusEvent.define("test.event", z.object({
    value: z.string(),
  }))

  it("should deliver event to subscriber", () => {
    let received = ""
    Bus.subscribe(TestEvent, (payload) => {
      received = payload.value
    })
    Bus.publish(TestEvent, { value: "hello" })
    expect(received).toBe("hello")
  })

  it("should deliver to multiple subscribers", () => {
    const TestEvent2 = BusEvent.define("test.multi", z.object({ n: z.number() }))
    const results: number[] = []
    Bus.subscribe(TestEvent2, (p) => results.push(p.n * 2))
    Bus.subscribe(TestEvent2, (p) => results.push(p.n * 3))
    Bus.publish(TestEvent2, { n: 10 })
    expect(results).toEqual([20, 30])
  })

  it("unsubscribe stops delivery", () => {
    const UnsEvent = BusEvent.define("test.unsub", z.object({ v: z.number() }))
    let count = 0
    const unsub = Bus.subscribe(UnsEvent, () => { count++ })
    Bus.publish(UnsEvent, { v: 1 })
    expect(count).toBe(1)
    unsub()
    Bus.publish(UnsEvent, { v: 2 })
    expect(count).toBe(1) // not incremented after unsub
  })

  it("unsubscribeAll stops delivery", () => {
    let count = 0
    const unsub = Bus.subscribeAll(() => { count++ })
    const E = BusEvent.define("test.unsub.all", z.object({}))
    Bus.publish(E, {})
    expect(count).toBeGreaterThan(0)
    const before = count
    unsub()
    Bus.publish(E, {})
    expect(count).toBe(before) // not incremented after unsub
  })

  it("subscribeAll should receive all events", () => {
    const received: string[] = []
    Bus.subscribeAll((payload) => {
      received.push(payload.type)
    })
    const E1 = BusEvent.define("test.all.a", z.object({}))
    const E2 = BusEvent.define("test.all.b", z.object({}))
    Bus.publish(E1, {})
    Bus.publish(E2, {})
    expect(received).toContain("test.all.a")
    expect(received).toContain("test.all.b")
  })
})

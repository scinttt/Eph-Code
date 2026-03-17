import { describe, test, expect, beforeEach } from "bun:test"
import { Permission } from "../../src/permission/permission"

describe("Permission", () => {
    // Reset askHandler before each test to avoid cross-test pollution
    beforeEach(() => {
        Permission.setAskHandler(null)
    })

    describe("check() via requestPermission()", () => {
        test("read-only tools are auto-allowed", async () => {
            for (const tool of ["read", "glob", "grep"]) {
                const result = await Permission.requestPermission(tool, {})
                expect(result).toBe("allow")
            }
        })

        test("write and edit are auto-allowed", async () => {
            for (const tool of ["write", "edit"]) {
                const result = await Permission.requestPermission(tool, {})
                expect(result).toBe("allow")
            }
        })

        test("invalid tool is auto-allowed", async () => {
            const result = await Permission.requestPermission("invalid", {})
            expect(result).toBe("allow")
        })

        test("bash requires ask (falls back to allow without handler)", async () => {
            // No handler registered → fallback to "allow"
            const result = await Permission.requestPermission("bash", {})
            expect(result).toBe("allow")
        })

        test("unknown tools default to ask (falls back to allow without handler)", async () => {
            const result = await Permission.requestPermission("some-future-tool", {})
            expect(result).toBe("allow")
        })
    })

    describe("askHandler interaction", () => {
        test("calls askHandler when level is ask and handler approves", async () => {
            let calledWith: { toolName: string; args: unknown } | null = null
            Permission.setAskHandler(async (toolName, args) => {
                calledWith = { toolName, args }
                return true
            })

            const result = await Permission.requestPermission("bash", { command: "ls" })
            expect(result).toBe("allow")
            expect(calledWith).toEqual({ toolName: "bash", args: { command: "ls" } })
        })

        test("returns deny when handler rejects", async () => {
            Permission.setAskHandler(async () => false)

            const result = await Permission.requestPermission("bash", { command: "rm -rf /" })
            expect(result).toBe("deny")
        })

        test("does not call askHandler for auto-allowed tools", async () => {
            let called = false
            Permission.setAskHandler(async () => {
                called = true
                return true
            })

            await Permission.requestPermission("read", { filePath: "/tmp/test" })
            expect(called).toBe(false)
        })

        test("returns deny when handler throws error", async () => {
            Permission.setAskHandler(async () => {
                throw new Error("readline crashed")
            })

            const result = await Permission.requestPermission("bash", { command: "ls" })
            expect(result).toBe("deny")
        })

        test("second setAskHandler replaces the first", async () => {
            Permission.setAskHandler(async () => false)
            Permission.setAskHandler(async () => true)

            const result = await Permission.requestPermission("bash", { command: "ls" })
            expect(result).toBe("allow")
        })
    })
})

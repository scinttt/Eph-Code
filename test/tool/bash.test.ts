import { describe, test, expect } from "bun:test"
import { BashTool, safeEnv } from "../../src/tool/bash"
import { ToolRegistry } from "../../src/tool/registry"
import { Agent } from "../../src/agent/agent"
import type { Tool } from "../../src/tool/tool"

/** Minimal Tool.Context stub for testing */
const stubCtx: Tool.Context = {
    sessionId: "test-session",
    messageId: "test-msg",
    agent: "build",
    abort: new AbortController().signal,
    callId: "test-call",
    messages: [],
    ask: async () => "allow" as const,
}

describe("BashTool", () => {
    test("echo command returns output", async () => {
        const result = await BashTool.execute({ command: "echo hello" }, stubCtx)
        expect(result.output).toContain("hello")
    })

    test("exit code reported on failure", async () => {
        const result = await BashTool.execute({ command: "exit 1" }, stubCtx)
        expect(result.output).toContain("Exit code")
    })

    test("timeout kills long-running command", async () => {
        const result = await BashTool.execute(
            { command: "sleep 999", timeout: 1000 },
            stubCtx
        )
        expect(result.output).toContain("timed out")
    }, 10_000) // extend jest timeout for this test

    test("cwd parameter works", async () => {
        const result = await BashTool.execute(
            { command: "pwd", cwd: "/tmp" },
            stubCtx
        )
        // macOS resolves /tmp → /private/tmp, so check both
        expect(result.output).toContain("/tmp")
    })

    test("stderr included in output", async () => {
        const result = await BashTool.execute(
            { command: "echo err >&2" },
            stubCtx
        )
        expect(result.output).toContain("STDERR")
        expect(result.output).toContain("err")
    })

    test("empty output handled", async () => {
        const result = await BashTool.execute({ command: "true" }, stubCtx)
        expect(result.output).toBe("(no output)")
    })

    test("pipe and redirect work", async () => {
        const result = await BashTool.execute(
            { command: "echo 'a b c' | wc -w" },
            stubCtx
        )
        expect(result.output.trim()).toContain("3")
    })

    test("title is the command string", async () => {
        const result = await BashTool.execute({ command: "echo test" }, stubCtx)
        expect(result.title).toBe("echo test")
    })
})

describe("safeEnv", () => {
    test("filters sensitive env vars", () => {
        const original = process.env.TEST_API_KEY
        process.env.TEST_API_KEY = "secret-value"
        try {
            const env = safeEnv()
            expect(env["TEST_API_KEY"]).toBeUndefined()
        } finally {
            if (original === undefined) delete process.env.TEST_API_KEY
            else process.env.TEST_API_KEY = original
        }
    })

    test("preserves normal env vars", () => {
        const env = safeEnv()
        expect(env["PATH"]).toBeDefined()
    })

    test("preserves empty string env vars", () => {
        const original = process.env.TEST_EMPTY_VAR
        process.env.TEST_EMPTY_VAR = ""
        try {
            const env = safeEnv()
            expect(env["TEST_EMPTY_VAR"]).toBe("")
        } finally {
            if (original === undefined) delete process.env.TEST_EMPTY_VAR
            else process.env.TEST_EMPTY_VAR = original
        }
    })

    test("filters AWS and ACCESS_KEY patterns", () => {
        const origAws = process.env.AWS_SECRET_ACCESS_KEY
        process.env.AWS_SECRET_ACCESS_KEY = "aws-key"
        try {
            const env = safeEnv()
            expect(env["AWS_SECRET_ACCESS_KEY"]).toBeUndefined()
        } finally {
            if (origAws === undefined) delete process.env.AWS_SECRET_ACCESS_KEY
            else process.env.AWS_SECRET_ACCESS_KEY = origAws
        }
    })

    test("filters TOKEN and PASSWORD patterns", () => {
        const origToken = process.env.MY_SECRET_TOKEN
        const origPwd = process.env.DB_PASSWORD
        process.env.MY_SECRET_TOKEN = "tok"
        process.env.DB_PASSWORD = "pwd"
        try {
            const env = safeEnv()
            expect(env["MY_SECRET_TOKEN"]).toBeUndefined()
            expect(env["DB_PASSWORD"]).toBeUndefined()
        } finally {
            if (origToken === undefined) delete process.env.MY_SECRET_TOKEN
            else process.env.MY_SECRET_TOKEN = origToken
            if (origPwd === undefined) delete process.env.DB_PASSWORD
            else process.env.DB_PASSWORD = origPwd
        }
    })
})

describe("BashTool integration", () => {
    test("registered and discoverable", () => {
        ToolRegistry.register(BashTool)
        expect(ToolRegistry.get("bash")).toBeDefined()
        expect(ToolRegistry.get("bash")!.name).toBe("bash")
    })

    test("build agent includes bash", () => {
        const agent = Agent.defaultAgent()
        expect(agent.tools).toContain("bash")
    })
})

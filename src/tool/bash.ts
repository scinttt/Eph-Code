import { z } from "zod"
import { Tool } from "./tool"
import { exec } from "child_process"
import { promisify } from "util"
import DESCRIPTION from "./bash.md"

const execAsync = promisify(exec)
const DEFAULT_TIMEOUT = 120_000 // 120s, same as Claude Code
const MAX_BUFFER = 1024 * 1024  // 1MB

/** Sensitive env var patterns — filtered out to prevent API key leakage */
const SENSITIVE_PATTERNS = [
    /API_KEY$/i, /SECRET$/i, /TOKEN$/i, /PASSWORD$/i,
    /ACCESS_KEY/i, /CREDENTIAL/i, /^AWS_/i,
]

/** Build a sanitized copy of process.env without sensitive keys */
export function safeEnv(): Record<string, string> {
    const env: Record<string, string> = {}
    for (const [key, value] of Object.entries(process.env)) {
        if (value === undefined) continue
        if (SENSITIVE_PATTERNS.some(p => p.test(key))) continue
        env[key] = value
    }
    return env
}

export const BashTool = Tool.define("bash", {
    description: DESCRIPTION,
    parameters: z.object({
        command: z.string().describe("The shell command to execute"),
        timeout: z.number().optional().describe("Timeout in ms (default 120000)"),
        cwd: z.string().optional().describe("Working directory (default: project root)"),
    }),
    execute: async (args, ctx) => {
        // TODO: wire ctx.abort to kill child process (TBD #17 — AbortSignal for all tools)
        const timeout = args.timeout ?? DEFAULT_TIMEOUT
        const cwd = args.cwd ?? process.cwd()

        try {
            const { stdout, stderr } = await execAsync(args.command, {
                cwd,
                timeout,
                maxBuffer: MAX_BUFFER,
                env: safeEnv(),
                shell: "bash",
            })
            let output = stdout
            if (stderr.trim()) output += `\nSTDERR:\n${stderr}`
            if (!output.trim()) output = "(no output)"
            return { title: args.command, output }
        } catch (error: unknown) {
            // exec rejects on non-zero exit code or timeout
            const e = error as {
                code?: number | string; killed?: boolean; signal?: string;
                stdout?: string; stderr?: string; message?: string
            }
            // maxBuffer exceeded — output too large
            if (e.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" || e.message?.includes("maxBuffer")) {
                let output = `Output exceeded ${MAX_BUFFER / 1024}KB limit. Use | head or | tail to reduce output.`
                if (e.stdout) output += `\n(partial output)\n${e.stdout}`
                return { title: args.command, output }
            }
            if (e.killed || e.signal === "SIGTERM") {
                return { title: args.command, output: `Command timed out after ${timeout}ms` }
            }
            let output = `Exit code: ${e.code ?? "unknown"}\n`
            if (e.stdout) output += e.stdout
            if (e.stderr) output += `\nSTDERR:\n${e.stderr}`
            return { title: args.command, output: output.trim() || `Command failed: ${e.message ?? "unknown error"}` }
        }
    }
})

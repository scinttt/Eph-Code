import { z } from "zod"
import { Tool } from "./tool"
import { execFileSync } from "child_process"
import DESCRIPTION from "./grep.md"

export const GrepTool = Tool.define("grep", {
    description: DESCRIPTION,
    parameters: z.object({
        pattern: z.string().describe("Regex pattern to search for"),
        path: z.string().optional().describe("Directory to search in, defaults to cwd"),
        include: z.string().optional().describe("File glob to filter (e.g. '*.ts')"),
    }),
    execute: async (args, ctx) => {
        const cwd = args.path ?? process.cwd()

        // Build args array to avoid shell injection
        const hasRg = (() => {
            try { execFileSync("which", ["rg"], { stdio: "ignore" }); return true } catch { return false }
        })()

        let bin: string
        let cmdArgs: string[]
        if (hasRg) {
            bin = "rg"
            cmdArgs = ["-n", "--no-heading", args.pattern]
            if (args.include) cmdArgs.push("-g", args.include)
            cmdArgs.push(cwd)
        } else {
            bin = "grep"
            cmdArgs = ["-rnH", args.pattern, cwd]
            if (args.include) cmdArgs.push(`--include=${args.include}`)
        }

        try {
            const output = execFileSync(bin, cmdArgs, { encoding: "utf-8", maxBuffer: 1024 * 1024 })
            if (!output.trim()) return { title: args.pattern, output: "No matches found." }
            return { title: args.pattern, output: output.trim() }
        } catch {
            return { title: args.pattern, output: "No matches found." }
        }
    }
})

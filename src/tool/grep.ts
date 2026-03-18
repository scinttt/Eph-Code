import { z } from "zod"
import { Tool } from "./tool"
import { execFile } from "child_process"
import { promisify } from "util"
import DESCRIPTION from "./grep.md"

const execFileAsync = promisify(execFile)

/** Cache ripgrep availability — no need to check every call */
let rgAvailable: boolean | null = null
async function hasRg(): Promise<boolean> {
    if (rgAvailable !== null) return rgAvailable
    try {
        await execFileAsync("which", ["rg"])
        rgAvailable = true
    } catch {
        rgAvailable = false
    }
    return rgAvailable
}

export const GrepTool = Tool.define("grep", {
    description: DESCRIPTION,
    parameters: z.object({
        pattern: z.string().describe("Regex pattern to search for"),
        path: z.string().optional().describe("Directory to search in, defaults to cwd"),
        include: z.string().optional().describe("File glob to filter (e.g. '*.ts')"),
    }),
    execute: async (args, ctx) => {
        const cwd = args.path ?? process.cwd()

        const useRg = await hasRg()
        let bin: string
        let cmdArgs: string[]
        if (useRg) {
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
            const { stdout } = await execFileAsync(bin, cmdArgs, {
                encoding: "utf-8",
                maxBuffer: 1024 * 1024,
            })
            if (!stdout.trim()) return { title: args.pattern, output: "No matches found." }
            return { title: args.pattern, output: stdout.trim() }
        } catch {
            return { title: args.pattern, output: "No matches found." }
        }
    }
})

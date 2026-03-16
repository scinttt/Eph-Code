import { z } from "zod"
import { Tool } from "./tool"
import { execSync } from "child_process"

export const GrepTool = Tool.define("grep", {
    description: "Search file contents using regex. Uses ripgrep if available, falls back to grep.",
    parameters: z.object({
        pattern: z.string().describe("Regex pattern to search for"),
        path: z.string().optional().describe("Directory to search in, defaults to cwd"),
        include: z.string().optional().describe("File glob to filter (e.g. '*.ts')"),
    }),
    execute: async (args, ctx) => {
        const cwd = args.path ?? process.cwd()
        // Check if ripgrep exists
        const hasRg = (() => {
            try { 
                execSync("which rg", { stdio: "ignore" }); 
                return true 
            } catch { 
                return false 
            }
        })()

        // Construct the commands for grep
        let cmd: string
        if (hasRg) {
            cmd = `rg -n --no-heading "${args.pattern.replace(/"/g, '\\"')}"`
            if (args.include) 
                cmd += ` -g "${args.include}"`
            cmd += ` "${cwd}"`
        } else {
            cmd = `grep -rnH "${args.pattern.replace(/"/g, '\\"')}" "${cwd}"`
            if (args.include) 
                cmd += ` --include="${args.include}"`
        }

        try {
            // Output type: string; Maxsize: 1MB
            const output = execSync(cmd, { encoding: "utf-8", maxBuffer: 1024 * 1024 })
            if (!output.trim()) return { title: args.pattern, output: "No matches found." }
            return { title: args.pattern, output: output.trim() }
        } catch {
            return { title: args.pattern, output: "No matches found." }
        }
    }
})
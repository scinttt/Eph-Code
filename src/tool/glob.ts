import { z } from "zod"
import { Tool } from "./tool"
import { glob } from "glob"
import DESCRIPTION from "./glob.md"

export const GlobTool = Tool.define("glob", {
    description: DESCRIPTION,
    parameters: z.object({
      pattern: z.string().describe("Glob pattern to match files (e.g. '**/*.ts')"),
      path: z.string().optional().describe("Directory to search in, defaults to cwd"),
    }),
    execute: async (args, ctx) => {
        // Search in the given path or by default in the current wokring directory
        const cwd = args.path ?? process.cwd()

        // Search with glob
        const matches = await glob(args.pattern, {
        cwd,
        ignore: ["node_modules/**", ".git/**"],
        dot: false,
        })

        // Sort the search result
        matches.sort()

        if (matches.length === 0) {
        return { title: args.pattern, output: "No files matched the pattern." }
        }
        return { title: args.pattern, output: matches.join("\n") }
    }
})
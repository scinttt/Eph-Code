import { z } from "zod"
import { Tool } from "./tool"
import * as fs from "fs/promises"
  
export const ReadTool = Tool.define("read",{
    description: "Read a file or list a directory. Returns file content with line numbers, or directory listing.",
    parameters: z.object({
        filePath: z.string().describe("Absolute path to the file or directory"),
        offset: z.number().optional().describe("Line number to start reading from (1-indexed)"),
        limit: z.number().optional().describe("Max number of lines to read, defaults to 2000")
    }),
    execute: async (args, ctx) => {
      const stat = await fs.stat(args.filePath)
      if (stat.isDirectory()) {
        const entries = await fs.readdir(args.filePath)
        return { title: args.filePath, output: entries.join("\n") }
      }
      const content = await fs.readFile(args.filePath, "utf-8")
      const lines = content.split("\n")
      const offset = (args.offset ?? 1) - 1
      const limit = args.limit ?? 2000
      const sliced = lines.slice(offset, offset + limit)
      const numbered = sliced.map((line, i) => `${offset + i + 1}\t${line}`)
      return { title: args.filePath, output: numbered.join("\n") }
    }
})

import { z } from "zod"
import { Tool } from "./tool"
import * as fs from "fs/promises"
import * as path from "path"
import { createTwoFilesPatch } from "diff"

export const WriteTool = Tool.define("write", {
    description: "Write content to a file. Creates the file if it doesn't exist, overwrites if it does.",
    parameters: z.object({
      filePath: z.string().describe("Absolute path to the file to write"),
      content: z.string().describe("The content to write to the file"),
    }),
    execute: async (args, ctx) => {
        const dir = path.dirname(args.filePath)
        await fs.mkdir(dir, { recursive: true })

        let oldContent = ""
        try { 
            oldContent = await fs.readFile(args.filePath, "utf-8") 
        } catch {}

        await fs.writeFile(args.filePath, args.content)

        const diff = createTwoFilesPatch(args.filePath, args.filePath, oldContent, args.content)
        return { 
            title: args.filePath, 
            output: `File written successfully.\n\n${diff}` 
        }
    }
})
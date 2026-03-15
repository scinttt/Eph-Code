import { z } from "zod"
import { Tool } from "./tool"

/** Fallback tool: returns error message when LLM calls a non-existent tool */
export const InvalidTool = Tool.define("invalid", {
    description: "Fallback for unrecognized tool calls",
    parameters: z.object({}),
    execute: async (args, ctx) => {
        return { 
        title: "Invalid Tool", 
        output: "The tool you called does not exist. Please use a valid tool name." }
    }
})
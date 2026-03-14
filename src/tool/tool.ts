import {ZodType} from "zod"
import type { Message } from "../session/message"
import { Truncate } from "./truncation"

export namespace Tool {
    /** Context passed to tool execution: session info, abort signal, permission check */
    export type Context = {
        sessionId: string
        messageId: string
        agent: string
        abort: AbortSignal
        callId: string
        messages: Message.Info[]
        ask: () => Promise<"allow" | "deny">
    }

    /** Tool definition after wrapping: name + description sent to LLM, execute runs locally */
    export type Info = {
        name: string
        description: string
        parameters: ZodType
        execute: (args: any, ctx: Context) => Promise<{
            title: string
            output: string
            metadata?: Record<string, unknown>
        }>
    }

    /** Factory: create a tool with auto Zod validation + output truncation */
    export function define(name: string, opts: {
        description: string
        parameters: ZodType
        execute: (args: any, ctx: Context) => Promise<{title: string; output: string; metadata?: Record<string,  unknown>}>
    }): Info{
        return {
            name,
            description: opts.description,
            parameters: opts.parameters,
            execute: async(args, ctx) => {
                const parsed = opts.parameters.parse(args)
                const result = await opts.execute(parsed, ctx)
                result.output = Truncate.tool_output(result.output)
                return result
            }
        }
    }
}

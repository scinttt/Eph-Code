import { streamText, stepCountIs } from "ai"
import { Provider } from "../provider/provider"
import { ToolRegistry } from "../tool/registry"
import { zodToJsonSchema } from "zod-to-json-schema"

/** Wraps AI SDK streamText: resolves model, converts tools, starts streaming */
export namespace LLM {
    export type StreamInput = {
        model?: string
        system: string[]
        messages: any[]
        maxSteps?: number
    }

    /** Start a streaming LLM call with all registered tools */
    export async function stream(input: StreamInput){
        const model = Provider.getLanguageModel(input.model)

        /** Convert our Tool.Info[] to AI SDK tool format */
        const tools: Record<string, any> = {}
        for(const tool of ToolRegistry.all()){
            tools[tool.name] = {
                description: tool.description,
                parameters: zodToJsonSchema(tool.parameters),
                execute: async(args: any) => {
                    const result = await tool.execute(args, {} as any)
                    return result.output
                }
            }
        }

        return streamText({
            model,
            system: input.system.join("\n\n"),
            messages: input.messages,
            tools,
            stopWhen: stepCountIs(input.maxSteps ?? 20)
        })
    }
}

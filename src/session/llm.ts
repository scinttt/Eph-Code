import { streamText, stepCountIs } from "ai"
import { Provider } from "../provider/provider"
import { ToolRegistry } from "../tool/registry"

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

        /** Convert our Tool.Info[] to AI SDK v6 tool format */
        const tools: Record<string, any> = {}
        for(const t of ToolRegistry.all()){
            tools[t.name] = {
                description: t.description,
                inputSchema: t.parameters,
                execute: async (args: any) => {
                    const result = await t.execute(args, {} as any)
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

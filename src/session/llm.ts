import { streamText } from "ai"
import { Provider } from "../provider/provider"
import { ToolRegistry } from "../tool/registry"

/** Wraps AI SDK streamText: resolves model, converts tools, starts streaming */
export namespace LLM {
    export type StreamInput = {
        model?: string
        system: string[]
        messages: any[]
        sessionId?: string
    }

    /** Start a single-round streaming LLM call (no auto tool execution) */
    export async function stream(input: StreamInput){
        const model = Provider.getLanguageModel(input.model)

        const tools: Record<string, any> = {}
        for(const t of ToolRegistry.all()){
            tools[t.name] = {
                description: t.description,
                inputSchema: t.parameters,
            }
        }

        return streamText({
            model,
            system: input.system.join("\n\n"),
            messages: input.messages,
            tools
        })
    }
}

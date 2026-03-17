export namespace Message {
    /** Text part of LLM response */
    export type TextPart = {
        type: "text"
        text: string
    }

    /** Reasoning part in the LLM response*/
    export type ReasoningPart = {
        type: "reasoning"
        reasoning: string
    }

    /** Tool part in the LLM response */
    export type ToolPart = {
        type: "tool"
        toolCallId: string
        toolName: string
        args: unknown
        state: "pending" | "running" | "completed" | "error"
        result?: string
        error?: string
    }

    /** A part can be any of the three types */
    export type Part = TextPart | ReasoningPart | ToolPart

    /** Used to construct the agent response including all LLM response parts */
    export type Info = {
        id: string
        sessionId: string
        role: "user" | "assistant"
        parts: Part[]
        time: {created: number; completed?: number}
        metadata: {
            model?: string
            usage?: {input: number; output: number}
        }
    }

    /** Convert our Info[] to AI SDK message format (tool results become separate "tool" role messages) */
    export function toModelMessages(messages: Info[]): Array<any>{
        const result: Array<any> = []
        for(const msg of messages){
            if(msg.role === "user"){
                const text = msg.parts
                    .filter((p): p is TextPart => p.type === "text")
                    .map((p) => p.text)
                    .join("\n")
                result.push({role: "user", content: text})
            }else{
                const content: any[] = []
                const toolResults: any[] = []
                for(const part of msg.parts){
                    switch(part.type){
                        case "text":
                            content.push({type: "text",  text: part.text})
                            break
                        case "reasoning":
                            content.push({type: "reasoning", text: part.reasoning})
                            break
                        case "tool":
                            content.push({
                                type: "tool-call",
                                toolCallId: part.toolCallId,
                                toolName: part.toolName,
                                input: part.args,
                            })
                            if(part.state === "completed" || part.state === "error"){
                                const value = part.state === "completed" ? part.result ?? "" : part.error ?? "unknown error"
                                toolResults.push({
                                    type: "tool-result",
                                    toolCallId: part.toolCallId,
                                    toolName: part.toolName,
                                    output: { type: "text", value },
                                })
                            }
                            break;
                    }
                }
                if(content.length > 0) result.push({role: "assistant", content})
                if(toolResults.length > 0) result.push({role: "tool", content: toolResults})
            }
        }

        return result
    }
}

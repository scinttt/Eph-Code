export namespace Message {
    export type TextPart = {
        type: "text"
        text: string
    }

    export type ReasoningPart = {
        type: "reasoning"
        reasoning: string
    }

    export type ToolPart = {
        type: "tool"
        toolCallId: string
        toolName: string
        args: unknown
        state: "pending" | "running" | "completed" | "error"
        result?: string
        error?: string
    }

    export type Part = TextPart | ReasoningPart | ToolPart

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
}

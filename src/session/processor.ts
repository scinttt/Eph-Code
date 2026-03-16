import { LLM } from "./llm"
import { SystemPrompt } from "./system"
import { Session } from "./session"
import { Message } from "./message"
import { Identifier } from "../util/id"
import { Bus } from "../bus/bus"
import { BusEvent } from "../bus/event"
import { z } from "zod"

/** Middle layer: calls LLM, processes the stream, builds assistant message */
export namespace SessionProcessor {
    /** Event: broadcast text delta for CLI to print in real-time */
    export const TextDelta = BusEvent.define("processor.text.delta", z.object({
        sessionId: z.string(),
        text: z.string(),
    }))

    /** Process one round: call LLM, stream response, build message from events */
    export async function process(sessionId: string, model?: string): Promise<"continue" | "stop">{
        const messages = Session.getMessages(sessionId) ?? []
        const system = await SystemPrompt.build()
        const modelMessages = Message.toModelMessages(messages)

        /** Start streaming LLM call */
        const response = await LLM.stream({
            model,
            system,
            messages: modelMessages
        })

        /** Create empty assistant message, will be filled by stream events */
        const assistantMsg: Message.Info = {
            id: Identifier.ascending("msg"),
            sessionId,
            role: "assistant",
            parts: [],
            time: { created: Date.now() },
            metadata: {}
        }

        /** Iterate over LLM stream events and build up assistantMsg.parts */
        for await (const event of response.fullStream){
            switch(event.type){
                case "text-delta":
                    /** Append text to existing TextPart, or create a new one */
                    let textPart = assistantMsg.parts.findLast(
                        (p): p is Message.TextPart => p.type === "text"
                    )
                    if(!textPart){
                        textPart = {type: "text", text: ""}
                        assistantMsg.parts.push(textPart)
                    }
                    textPart.text += event.text
                    Bus.publish(TextDelta, {sessionId, text: event.text})
                    break
                case "tool-call":
                    /** LLM wants to call a tool, record it as running */
                    assistantMsg.parts.push({
                        type: "tool",
                        toolCallId: event.toolCallId,
                        toolName: event.toolName,
                        args: event.input,
                        state: "running",
                    })
                    break
                case "tool-result":
                    /** Tool finished, update state and store result */
                    const toolPart = assistantMsg.parts.find(
                        (p): p is Message.ToolPart => p.type === "tool" && p.toolCallId === event.toolCallId
                    )
                    if(toolPart){
                        toolPart.state = "completed"
                        toolPart.result = typeof event.output === "string" ? event.output : JSON.stringify(event.output)
                    }
                    break
            }
        }

        /** Save completed message to session */
        assistantMsg.time.completed = Date.now()
        Session.addMessage(sessionId, assistantMsg)
        return "stop"
    }
}

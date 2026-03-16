import { z } from "zod"

import { LLM } from "./llm"
import { SystemPrompt } from "./system"
import { Session } from "./session"
import { Message } from "./message"
import { Identifier } from "../util/id"
import { Bus } from "../bus/bus"
import { BusEvent } from "../bus/event"
import { ToolRegistry } from "../tool/registry"
import { SessionRetry } from "./retry"
import { SessionCompaction } from "./compaction"
import { Tool } from "../tool/tool"

const MAX_STEPS = 20
const MAX_RETRIES = 3
export namespace SessionProcessor {
    /** Event: broadcast text delta for CLI to print in real-time */
    export const TextDelta = BusEvent.define("processor.text.delta", z.object({
        sessionId: z.string(),
        text: z.string(),
    }))

    /** Process conversation: loop LLM → tools until done, doom loop, or max steps */
    export async function process(sessionId: string, model?: string): Promise<"continue" | "compact" | "stop">{
        const system = await SystemPrompt.build()

        for(let step = 0; step < MAX_STEPS; step++){
            const messages = Session.getMessages(sessionId) ?? []
            const modelMessages = Message.toModelMessages(messages)

            /** Call LLM with retry */
            let response
            for(let attempt = 0; attempt <= MAX_RETRIES; attempt++){
                try{
                    response =  await LLM.stream({
                        model, system, messages: modelMessages
                    })
                    break
                } catch (error){
                    if(attempt < MAX_RETRIES && SessionRetry.retryable(error)){
                        const delayMs =  SessionRetry.delay(attempt, error)
                        console.error(`\n[retry ${attempt + 1}/${MAX_RETRIES}] waiting +${delayMs}ms...`)
                        await SessionRetry.sleep(delayMs)
                        continue
                    }
                    throw error
                }
            }

            if (!response) 
                throw new Error("LLM stream failed after retries")

            /** Create empty assistant message, filled by stream events*/
            const assistantMsg: Message.Info = {
                id: Identifier.ascending("msg"),
                sessionId,
                role: "assistant",
                parts: [],
                time: { created: Date.now() },
                metadata: {}
            }
            
            /** Collect tool calls from this round */
            const toolCalls: Array<{
                toolCallId: string;
                toolName: string;
                input: unknown
            }> = []


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
                        toolCalls.push({
                            toolCallId: event.toolCallId,
                            toolName: event.toolName,
                            input: event.input
                        })
                        /** LLM wants to call a tool, record it as running */
                        assistantMsg.parts.push({
                            type: "tool",
                            toolCallId: event.toolCallId,
                            toolName: event.toolName,
                            args: event.input,
                            state: "pending",
                        })
                        break
                    case "error":
                        console.error(`\n[stream error] ${event.error}`)
                        break
                }
            }
            
            /** No tool calls — LLM is done, save and return */
            if (toolCalls.length === 0) {
                assistantMsg.time.completed = Date.now()
                Session.addMessage(sessionId, assistantMsg)
                return "stop"
            }

            /** Doom loop detection: last 3 tool calls same name + same args */
            if(isDoomLoop(assistantMsg.parts)){
                console.error("\n[doom loop detected] terminating agent loop")
                assistantMsg.time.completed = Date.now()
                Session.addMessage(sessionId, assistantMsg)
                return "stop"
            }

            /**  Execute each tool call and update parts */
            for(const call of toolCalls) {
                const toolPart = assistantMsg.parts.find(
                    (p): p is  Message.ToolPart => p.type === "tool" && p.toolCallId === call.toolCallId
                )

                if(!toolPart) continue

                toolPart.state = "running"
                const tool = ToolRegistry.get(call.toolName) ?? ToolRegistry.get("invalid")
                
                if (!tool) continue

                try{
                    const ctx: Tool.Context = {
                        sessionId,
                        messageId: assistantMsg.id,
                        agent: "build",
                        abort: new AbortController().signal,
                        callId: call.toolCallId,
                        messages: Session.getMessages(sessionId) ?? [],
                        ask: async () => "allow" as const
                    }
                    const result = await tool.execute(call.input, ctx)
                    toolPart.state = "completed"
                    toolPart.result = result.output
                } catch (error) {
                    toolPart.state = "error"
                    toolPart.error = error instanceof Error ? error.message : String(error)
                }
            }

            assistantMsg.time.completed = Date.now()
            Session.addMessage(sessionId, assistantMsg)

            /** Check if context is overflowing after tool execution */
            if (SessionCompaction.isOverflow(sessionId)) {
                return "compact"
            }
        }
        
        console.error(`\n[max steps ${MAX_STEPS} reached] terminating agent loop`)
        return "stop"
    }

    function isDoomLoop(parts: Message.Part[]): boolean{
        const toolParts = parts.filter(
            (p): p is Message.ToolPart => p.type === "tool"
        )

        if (toolParts.length < 3) return false

        const last3 = toolParts.slice(-3)
        const first = last3[0]!
        return last3.every(
            (t) => t.toolName === first.toolName && JSON.stringify(t.args) === JSON.stringify(first.args)
        )
    }
}

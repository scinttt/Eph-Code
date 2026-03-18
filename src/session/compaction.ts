import { Log } from "../util/log"
import { Token } from "../util/token"
import { Session } from "./session"
import { Message } from "./message"
import { LLM } from "./llm"
import { Identifier } from "../util/id"
import * as fs from "fs/promises"
import * as path from "path"

const CONTEXT_LIMIT = 120000 // ~120K tokens, conservative default
const OVERFLOW_RATIO = 0.8 // trigger at 80%
const PRUNE_PROTECT = 40000 // protect last 40K tokens (all part types) from pruning

/** Safe JSON.stringify that won't throw on circular/BigInt */
function safeStringify(value: unknown): string {
    try { return JSON.stringify(value) } catch { return "" }
}

export namespace SessionCompaction{
    /** Check if total conversation tokens exceed 80% of context limit */
    export function isOverflow(sessionId: string): boolean{
        const messages = Session.getMessages(sessionId) ?? []
        let total = 0
        for(const msg of messages){
            for(const part of msg.parts){
                if(part.type === "text")
                    total += Token.estimate(part.text)
                else if(part.type === "reasoning")
                    total += Token.estimate(part.reasoning)
                else if(part.type === "tool"){
                    total += Token.estimate(part.result ?? "")
                    total += Token.estimate(safeStringify(part.args))
                }
            }
        }

        return total >= CONTEXT_LIMIT * OVERFLOW_RATIO
    }

    /** Prune old tool outputs, protect recent context (last 40K tokens across all part types) */
    export function prune(sessionId: string): number{
        const messages = Session.getMessages(sessionId) ?? []
        let protectedTokens = 0
        let prunedTokens = 0
        let reachedProtectionLimit = false

        // Scan backwards: first accumulate recent tokens, then start compacting
        for(let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i]!

            for(const part of msg.parts){
                // Count all part types toward protection budget
                let partTokens = 0
                if(part.type === "text") partTokens = Token.estimate(part.text)
                else if(part.type === "reasoning") partTokens = Token.estimate(part.reasoning)
                else if(part.type === "tool") partTokens = Token.estimate(part.result ?? "") + Token.estimate(safeStringify(part.args))

                if(!reachedProtectionLimit) {
                    protectedTokens += partTokens
                    if(protectedTokens >= PRUNE_PROTECT) reachedProtectionLimit = true
                    continue
                }

                // Past protection limit: compact tool results
                if(part.type === "tool" && part.state === "completed" && part.result && part.result !== "[compacted]") {
                    prunedTokens += Token.estimate(part.result)
                    part.result = "[compacted]"
                }
            }
        }
        return prunedTokens
    }

    /** Generate a structured summary of the conversation */
    export async function summarize(sessionId: string): Promise<void> {
        // First prune old tool outputs
        prune(sessionId)

        // If still overflow, generate summary
        if (!isOverflow(sessionId)) return

        const messages = Session.getMessages(sessionId) ?? []
        const promptPath = path.join(import.meta.dir, "../agent/prompt/compaction.md")
        const compactionPrompt = await fs.readFile(promptPath, "utf-8")

        const modelMessages = Message.toModelMessages(messages)
        modelMessages.push({ role: "user", content: compactionPrompt })

        try {
            const response = await LLM.stream({
                system: ["You are a conversation summarizer."],
                messages: modelMessages,
            })

            let summary = ""
            for await (const event of response.fullStream) {
                if (event.type === "text-delta")
                    summary += event.text
            }

            // Replace all messages with the summary
            const summaryMsg: Message.Info = {
                id: Identifier.ascending("msg"),
                sessionId,
                role: "assistant",
                parts: [{ type: "text", text: summary }],
                time: { created: Date.now(), completed: Date.now() },
                metadata: {},
            }

            // Clear old messages and add summary
            const sessionMessages = Session.getMessages(sessionId)
            if (sessionMessages) {
                sessionMessages.length = 0
                sessionMessages.push(summaryMsg)
            }
        } catch (error) {
            // Summarization failed — prune already done, continue without summary
            Log.error(`[compaction error] ${error instanceof Error ? error.message : String(error)}`)
        }
    }
}

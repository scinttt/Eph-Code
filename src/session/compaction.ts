import { Token } from "../util/token"
import { Session } from "./session"
import { Message } from "./message"
import { LLM } from "./llm"
import { Identifier } from "../util/id"
import * as fs from "fs/promises"
import * as path from "path"

const CONTEXT_LIMIT = 120000 // ~120K tokens, conservative default
const OVERFLOW_RATIO = 0.8 // trigger at 80%
const PRUNE_PROTECT = 40000 // project last 40K tokens from pruning

export namespace SessionCompaction{
    /** Check if  total conversation tokens exceed 80% of context limit */
    export function isOverflow(sessionId: string): boolean{
        const messages = Session.getMessages(sessionId) ?? []
        let total = 0
        for(const msg of messages){
            for(const part of msg.parts){
                if(part.type === "text") 
                    total += Token.estimate(part.text)
                else if(part.type === "reasoning")
                    total +=  Token.estimate(part.reasoning)
                else if(part.type === "tool"){
                    total += Token.estimate(part.result ?? "")
                    total += Token.estimate(JSON.stringify(part.args))
                }
            }
        }

        return total  >= CONTEXT_LIMIT * OVERFLOW_RATIO
    }

    /** Prune old tool outputs,  protect recent context */
    export function prune(sessionId: string): number{
        const messages = Session.getMessages(sessionId) ?? []
        let turns = 0
        let scanned = 0

        for(let i = messages.length  - 1; i >= 0; i--) {
            const msg = messages[i]!
            if(msg.role === "user")
                turns++
            if(turns<2) continue

            for(const part of msg.parts){
                if(part.type === "tool" && part.state === "completed" && part.result) {
                    const tokens = Token.estimate(part.result)
                    
                    if(scanned >= PRUNE_PROTECT) {
                        part.result = "[compacted]"
                        scanned += tokens
                    } else {
                        scanned += tokens
                    }
                }
            }
        }
        return scanned
    }

    /** Generate a  structured summary of the conversation */
    export async function summarize(sessionId: string): Promise<void>  {
        // First prune old tool outputs
        prune(sessionId)

        // if still overflow, generate summary
        if (!isOverflow(sessionId)) return

        const messages = Session.getMessages(sessionId) ?? []
        const promptPath = path.join(import.meta.dir, "../agent/prompt/compaction.md")
        const compactionPrompt = await fs.readFile(promptPath, "utf-8")

        const modelMessages = Message.toModelMessages(messages)
        modelMessages.push({ role: "user", content: compactionPrompt })

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
    }
}
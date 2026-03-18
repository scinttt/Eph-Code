import { SessionProcessor } from "./processor"
import { SessionCompaction } from "./compaction"

/** Outer loop: keep calling processor, handle compact and stop */
export namespace SessionPrompt {
    export async function loop(sessionId: string, model?: string, abort?: AbortSignal){
        while(true){
            // Check abort before each processor round
            if (abort?.aborted) break

            const result = await SessionProcessor.process(sessionId, model, abort)
            if(result === "stop") break
            if(result === "compact"){
                await SessionCompaction.summarize(sessionId)
            }
        }
    }
}

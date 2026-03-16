import { SessionProcessor } from "./processor"
import { SessionCompaction } from "./compaction"

/** Outer loop: keep calling processor, handle compact and stop */
export namespace SessionPrompt {
    export async function loop(sessionId: string, model?: string){
        while(true){
            const result = await SessionProcessor.process(sessionId, model)
            if(result === "stop") break
            if(result === "compact"){
                await SessionCompaction.summarize(sessionId)
            }
        }
    }
}

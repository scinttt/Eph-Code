import { SessionProcessor } from "./processor";

export namespace SessionPrompt {
    export async function loop(sessionId: string, model?: string){
        // Outer loop: keep calling processor until. it returns "stop"
        while(true){
            const result = await SessionProcessor.process(sessionId, model)
            if(result === "stop")
                break;
        }
    }
}

import * as fs from "fs/promises"
import * as path from "path"
import { Log } from "../util/log"

const DEFAULT_PROMPT = "You are a helpful coding assistant. Use the available tools to help the user."

export namespace SystemPrompt {
    export async function build(): Promise<string[]> {
        const promptPath = path.join(import.meta.dir, "../agent/prompt/build.md")
        let basePrompt: string
        try {
            basePrompt = await fs.readFile(promptPath, "utf-8")
        } catch (error) {
            Log.warn(`[system] Failed to read prompt file: ${promptPath}, using default`)
            basePrompt = DEFAULT_PROMPT
        }
        const envInfo = [
            `Working directory: ${process.cwd()}`,
            `Platform: ${process.platform}`,
            `Date: ${new Date().toISOString().split("T")[0]}`,
        ].join("\n")
        return [basePrompt, envInfo]
    }
}
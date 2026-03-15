import * as fs from "fs/promises"
import * as path from "path"

export namespace SystemPrompt {
    export async function build(): Promise<string[]> {
        const promptPath = path.join(import.meta.dir, "../agent/prompt/build.md")
        const basePrompt = await fs.readFile(promptPath, "utf-8")
        const envInfo = [
            `Working directory: ${process.cwd()}`,
            `Platform: ${process.platform}`,
            `Date: ${new Date().toISOString().split("T")[0]}`,
        ].join("\n")
        return [basePrompt, envInfo]
    }
}
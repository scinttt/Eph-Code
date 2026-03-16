import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

export namespace Provider {
    const DEFAULT_MODEL = "deepseek/deepseek-chat"

    export function parseModel(model?: string): { provider: string; model: string } {
        const raw = model ?? process.env.EPH_MODEL ?? DEFAULT_MODEL
        const parts = raw.split("/")
        return { provider: parts[0]!, model: parts.slice(1).join("/") }
    }

    export function getLanguageModel(model?: string) {
        const parsed = parseModel(model)
        switch (parsed.provider) {
            case "anthropic":
                return createAnthropic()(parsed.model)
            case "google":
                return createGoogleGenerativeAI()(parsed.model)
            case "deepseek":
                return createOpenAICompatible({
                    name: "deepseek",
                    baseURL: "https://api.deepseek.com/v1",
                    apiKey: process.env.DEEPSEEK_API_KEY,
                })(parsed.model)
            case "codex":
                // TODO: fill in real baseURL when ready
                return createOpenAICompatible({
                    name: "codex",
                    baseURL: "...",
                    apiKey: process.env.CODEX_API_KEY ?? "",
                })(parsed.model)
            case "glm":
                // TODO: fill in real baseURL when ready
                return createOpenAICompatible({
                    name: "glm",
                    baseURL: "...",
                    apiKey: process.env.GLM_API_KEY ?? "",
                })(parsed.model)
            default:
                throw new Error(`Unknown provider: ${parsed.provider}`)
        }
    }
}

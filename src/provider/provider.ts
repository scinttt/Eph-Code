import type { LanguageModel } from "ai"
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

    // TODO: remove `as any` once AI SDK provider packages align on LanguageModel version
    export function getLanguageModel(model?: string): LanguageModel {
        const parsed = parseModel(model)
            switch (parsed.provider) {
            case "anthropic":
                return createAnthropic()(parsed.model) as any
            case "google":
                return createGoogleGenerativeAI()(parsed.model) as any
            case "deepseek":
                return createOpenAICompatible({
                    name: "deepseek",
                    baseURL: "https://api.deepseek.com/v1",
                    apiKey: process.env.DEEPSEEK_API_KEY,
                })(parsed.model) as any
            case "codex":
                return createOpenAICompatible({
                    name: "codex",
                    baseURL: "...",
                    apiKey: process.env.CODEX_API_KEY ?? "",
                })(parsed.model) as any
            case "glm":
                return createOpenAICompatible({
                    name: "glm",
                    baseURL: "...",
                    apiKey: process.env.GLM_API_KEY ?? "",
                })(parsed.model) as any
            default:
                throw new Error(`Unknown provider: ${parsed.provider}`)
        }
    }
}

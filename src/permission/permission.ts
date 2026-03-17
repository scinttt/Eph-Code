export namespace Permission {
    type Level = "allow" | "ask" | "deny"

    type Rule = { tool: string; level: Level }

    // By default allow all tools except bash
    const DEFAULT_RULES: Rule[] = [
        { tool: "read",    level: "allow" },
        { tool: "glob",    level: "allow" },
        { tool: "grep",    level: "allow" },
        { tool: "write",   level: "allow" },
        { tool: "edit",    level: "allow" },
        { tool: "invalid", level: "allow" },
        { tool: "bash",    level: "ask" },
    ]

    // Register by CLI
    let askHandler: ((toolName: string, args: unknown) => Promise<boolean>) | null = null

    // Check the permission of the tool：
    function check(toolName: string): Level{
        const rule = DEFAULT_RULES.find(r => r.tool === toolName)
        return rule?.level ?? "ask"
    }

    // The method used by CLI to ask user
    export function setAskHandler(handler: ((toolName: string, args: unknown) => Promise<boolean>) | null): void{
        askHandler = handler
    }

    // Whole permission check: check table + ask user
    export async function requestPermission(toolName: string, args: unknown): Promise<"allow" | "deny"> {
        const level =  check(toolName)
        if(level ===  "allow") return  "allow"
        if(level === "deny") return "deny"
        //level == "ask"
        if(askHandler){
            try {
                const allowed = await askHandler(toolName, args)
                return allowed ? "allow" : "deny"
            } catch (error) {
                console.error(`[permission] askHandler error: ${error instanceof Error ? error.message : String(error)}`)
                return "deny"
            }
        }

        // Fallback: no askHandler registered (e.g. test env) → allow.
        // CLI always registers a handler at startup, so this only fires in tests.
        return "allow"
    }
}
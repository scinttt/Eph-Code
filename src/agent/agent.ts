/** Agent definitions: each agent has its own prompt, tool set, and step limit */
export namespace Agent {
    export type Info = {
        name: string
        systemPrompt: string
        tools: string[]
        maxSteps: number
    }

    /** All registered agents */
    const agents = new Map<string, Info>()

    /** Built-in build agent: default coding assistant */
    agents.set("build", {
        name: "build",
        systemPrompt: "build",
        tools: ["read", "write", "edit", "glob", "grep", "invalid"],
        maxSteps: 20
    })

    /** Get an agent by name */
    export function get(name: string): Info | undefined{
        return agents.get(name)
    }

    /** Get the default agent (build) */
    export function defaultAgent(): Info{
        return agents.get("build")!
    }
}

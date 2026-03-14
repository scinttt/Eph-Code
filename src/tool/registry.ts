import { Tool } from "./tool";

export namespace ToolRegistry {
    const tools = new Map<string, Tool.Info>()

    export function register(tool: Tool.Info){
        tools.set(tool.name, tool)
    }

    export function get(name: string): Tool.Info | undefined{
        return tools.get(name)
    }

    export function all(): Tool.Info[]{
        return Array.from(tools.values())
    }
}

export namespace Truncate {
    const MAX_LINES = 2000
    const MAX_BYTES = 50 * 1024

    // truncate the long tool output based on Lines and Bytes limit
    export function tool_output(text: string): string{
        const lines = text.split("\n")
        if(lines.length > MAX_LINES){
            text = lines.slice(0, MAX_LINES).join("\n")
            text += `\n\n[truncated: ${lines.length - MAX_LINES} lines omitted]`
        }
        if(new TextEncoder().encode(text).length > MAX_BYTES){
            const encoder = new TextEncoder()
            const truncated = new TextDecoder().decode(encoder.encode(text).slice(0, MAX_BYTES))
            text = truncated + `\n\n[truncated: exceeded ${MAX_BYTES / 1024}KB limit]`
        }
        return text
    }
}

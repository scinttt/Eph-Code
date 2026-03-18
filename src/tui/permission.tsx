import React from "react"
import { Box, Text, useInput } from "ink"

type Props = {
    toolName: string
    args: unknown
    onRespond: (allowed: boolean) => void
}

export function PermissionDialog({ toolName, args, onRespond }: Props) {
    useInput((input) => {
        if (input === "y" || input === "Y") onRespond(true)
        else if (input === "n" || input === "N") onRespond(false)
    })

    let preview: string
    try {
        preview = typeof args === "object" && args !== null
            ? JSON.stringify(args, null, 2).slice(0, 200)
            : String(args)
    } catch {
        preview = "[unserializable]"
    }

    return (
        <Box borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column">
            <Text bold color="yellow">{"⚠ Permission Required"}</Text>
            <Text>Tool: <Text bold>{toolName}</Text></Text>
            <Text dimColor>{preview}</Text>
            <Text>Allow? <Text bold color="green">[y]</Text> / <Text bold color="red">[n]</Text></Text>
        </Box>
    )
}

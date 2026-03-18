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
            ? JSON.stringify(args).slice(0, 80)
            : String(args).slice(0, 80)
    } catch {
        preview = "[unserializable]"
    }

    return (
        <Box paddingX={1}>
            <Text color="yellow" bold>{"⚠ "}</Text>
            <Text>Allow </Text>
            <Text bold color="cyan">{toolName}</Text>
            <Text dimColor> {preview} </Text>
            <Text bold color="green">[y]</Text>
            <Text> / </Text>
            <Text bold color="red">[n]</Text>
        </Box>
    )
}

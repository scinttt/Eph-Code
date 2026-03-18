import React from "react"
import { Box, Text } from "ink"

let msgCounter = 0

export type DisplayMessage = {
    id: number
    role: "user" | "assistant" | "error" | "tool"
    text: string
}

/** Create a DisplayMessage with auto-incrementing ID */
export function createDisplayMessage(role: DisplayMessage["role"], text: string): DisplayMessage {
    return { id: ++msgCounter, role, text }
}

type Props = {
    messages: DisplayMessage[]
    streamText: string
    reserveRows?: number
}

const ROLE_COLOR: Record<DisplayMessage["role"], string> = {
    user: "blue",
    assistant: "white",
    error: "red",
    tool: "gray",
}

const ROLE_PREFIX: Record<DisplayMessage["role"], string> = {
    user: "You",
    assistant: "LLM",
    error: "Error",
    tool: "Tool",
}

export function Messages({ messages, streamText, reserveRows = 0 }: Props) {
    // Self-clip: Ink's overflow="hidden" doesn't reliably clip content.
    // Only render last N messages that fit in available terminal height.
    // Reserve: 3 StatusBar + 1 Input + 1 padding + extra for PermissionDialog etc.
    const maxVisible = Math.max(3, (process.stdout.rows ?? 24) - 5 - reserveRows)
    const visible = messages.slice(-maxVisible)

    return (
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
            {visible.map((msg) => (
                <Box key={msg.id} marginBottom={msg.role === "user" ? 0 : 1}>
                    <Text bold color={ROLE_COLOR[msg.role]}>
                        {ROLE_PREFIX[msg.role]}:{" "}
                    </Text>
                    <Text color={ROLE_COLOR[msg.role]} wrap="wrap">
                        {msg.text}
                    </Text>
                </Box>
            ))}
            {streamText && (
                <Box>
                    <Text bold color="white">LLM: </Text>
                    <Text wrap="wrap">{streamText}</Text>
                </Box>
            )}
        </Box>
    )
}

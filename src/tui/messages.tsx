import React from "react"
import { Box, Text } from "ink"

export type DisplayMessage = {
    role: "user" | "assistant" | "error" | "tool"
    text: string
}

type Props = {
    messages: DisplayMessage[]
    streamText: string
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

export function Messages({ messages, streamText }: Props) {
    return (
        <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
            {messages.map((msg, i) => (
                <Box key={i} marginBottom={msg.role === "user" ? 0 : 1}>
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

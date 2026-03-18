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
    termRows: number
    termColumns: number
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

/** Estimate how many terminal rows a message will occupy */
function estimateRows(text: string, termWidth: number): number {
    const prefix = 6 // "LLM: " or "You: " etc.
    const usable = Math.max(20, termWidth - 4) // paddingX + prefix
    let rows = 0
    for (const line of text.split("\n")) {
        // Chinese/CJK characters are ~2 columns wide in terminal
        let cols = 0
        for (const ch of line) {
            cols += ch.charCodeAt(0) > 0x7f ? 2 : 1
        }
        rows += Math.max(1, Math.ceil((cols + prefix) / usable))
    }
    return rows + 1 // +1 for marginBottom
}

/** Clip messages from the end to fit within maxRows */
function clipMessages(messages: DisplayMessage[], maxRows: number, termWidth: number): DisplayMessage[] {
    let rowCount = 0
    let startIndex = messages.length
    for (let i = messages.length - 1; i >= 0; i--) {
        const msgRows = estimateRows(messages[i]!.text, termWidth)
        if (rowCount + msgRows > maxRows) break
        rowCount += msgRows
        startIndex = i
    }
    return messages.slice(startIndex)
}

export function Messages({ messages, streamText, reserveRows = 0, termRows, termColumns }: Props) {
    // Reserve: 3 StatusBar (border+content+border) + 1 Input + 1 padding + extra
    const maxRows = Math.max(3, termRows - 5 - reserveRows)

    // Account for streaming text rows
    let availableRows = maxRows
    if (streamText) {
        availableRows -= estimateRows(streamText, termColumns)
    }

    const visible = clipMessages(messages, Math.max(1, availableRows), termColumns)

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

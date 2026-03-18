import React from "react"
import { Box, Text } from "ink"

export type AppStatus = "idle" | "thinking" | "tool"

type Props = {
    status: AppStatus
    model: string
}

const STATUS_LABEL: Record<AppStatus, string> = {
    idle: "Ready",
    thinking: "Thinking...",
    tool: "Running tool...",
}

const STATUS_COLOR: Record<AppStatus, string> = {
    idle: "green",
    thinking: "yellow",
    tool: "cyan",
}

export function StatusBar({ status, model }: Props) {
    return (
        <Box borderStyle="single" borderColor="gray" paddingX={1} justifyContent="space-between">
            <Text color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Text>
            <Text dimColor>Model: {model}</Text>
        </Box>
    )
}

import React, { useState, useEffect, useRef } from "react"
import { Box, Text } from "ink"

export type AppStatus = "idle" | "thinking" | "tool"

type Props = {
    status: AppStatus
    model: string
}

const STATUS_COLOR: Record<AppStatus, string> = {
    idle: "green",
    thinking: "yellow",
    tool: "cyan",
}

/** Format seconds as "Xs" or "Xm Ys" */
function formatElapsed(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
}

export function StatusBar({ status, model }: Props) {
    const [elapsed, setElapsed] = useState(0)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Start/stop timer based on status
    useEffect(() => {
        if (status !== "idle") {
            setElapsed(0)
            timerRef.current = setInterval(() => {
                setElapsed(prev => prev + 1)
            }, 1000)
        } else {
            if (timerRef.current) clearInterval(timerRef.current)
            timerRef.current = null
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [status])

    let label: string
    if (status === "idle") {
        label = "Ready"
    } else if (status === "thinking") {
        label = `Thinking... ${formatElapsed(elapsed)}`
    } else {
        label = `Running tool... ${formatElapsed(elapsed)}`
    }

    return (
        <Box borderStyle="single" borderColor="gray" paddingX={1} justifyContent="space-between">
            <Text color={STATUS_COLOR[status]}>{label}</Text>
            <Text dimColor>Model: {model}</Text>
        </Box>
    )
}

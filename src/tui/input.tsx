import React, { useState } from "react"
import { Box, Text } from "ink"
import TextInput from "ink-text-input"

type Props = {
    onSubmit: (text: string) => void
    disabled: boolean
}

export function Input({ onSubmit, disabled }: Props) {
    const [value, setValue] = useState("")

    const handleSubmit = (text: string) => {
        const trimmed = text.trim()
        if (!trimmed) return
        setValue("")
        onSubmit(trimmed)
    }

    return (
        <Box paddingX={1}>
            <Text color="cyan" bold>{"❯ "}</Text>
            {disabled ? (
                <Text dimColor>waiting...</Text>
            ) : (
                <TextInput
                    value={value}
                    onChange={setValue}
                    onSubmit={handleSubmit}
                    placeholder="Type a message..."
                />
            )}
        </Box>
    )
}

import React from "react"
import { Box, Text } from "ink"

const LOGO = `
  ███████╗██████╗ ██╗  ██╗
  ██╔════╝██╔══██╗██║  ██║
  █████╗  ██████╔╝███████║
  ██╔══╝  ██╔═══╝ ██╔══██║
  ███████╗██║     ██║  ██║
  ╚══════╝╚═╝     ╚═╝  ╚═╝
`.trimStart()

type Props = {
    model: string
    toolCount: number
}

export function Banner({ model, toolCount }: Props) {
    return (
        <Box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1}>
            <Text color="cyan">{LOGO}</Text>
            <Text bold color="white">Eph-Code</Text>
            <Text dimColor>AI Coding Agent</Text>
            <Box marginTop={1} flexDirection="column" alignItems="center">
                <Text>Model: <Text color="green">{model}</Text></Text>
                <Text>Tools: <Text color="green">{toolCount}</Text> available</Text>
            </Box>
            <Box marginTop={1}>
                <Text dimColor>Type a message to start, "exit" to quit</Text>
            </Box>
        </Box>
    )
}

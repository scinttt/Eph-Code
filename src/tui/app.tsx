import React, { useState, useEffect, useRef } from "react"
import { Box, useApp, useInput } from "ink"

import { Session } from "../session/session"
import { SessionPrompt } from "../session/prompt"
import { SessionProcessor } from "../session/processor"
import { Message } from "../session/message"
import { Identifier } from "../util/id"
import { Bus } from "../bus/bus"
import { Permission } from "../permission/permission"

import { Messages, type DisplayMessage } from "./messages"
import { Input } from "./input"
import { StatusBar, type AppStatus } from "./status"
import { PermissionDialog } from "./permission"

export function App() {
    const { exit } = useApp()
    const [sessionId] = useState(() => Session.create().id)
    const [messages, setMessages] = useState<DisplayMessage[]>([])
    const [streamText, setStreamText] = useState("")
    const [status, setStatus] = useState<AppStatus>("idle")
    const [permDialog, setPermDialog] = useState<{ toolName: string; args: unknown } | null>(null)
    const permResolveRef = useRef<((allowed: boolean) => void) | null>(null)
    const streamRef = useRef("")

    // Subscribe to Bus events with cleanup
    useEffect(() => {
        const unsub1 = Bus.subscribe(SessionProcessor.TextDelta, (p) => {
            streamRef.current += p.text
            setStreamText(streamRef.current)
        })
        return () => { unsub1() }
    }, [])

    // Register Permission handler with cleanup
    useEffect(() => {
        Permission.setAskHandler(async (toolName, args) => {
            return new Promise<boolean>((resolve) => {
                permResolveRef.current = resolve
                setPermDialog({ toolName, args })
            })
        })
        return () => { Permission.setAskHandler(null) }
    }, [])

    // Ctrl+C / exit handling
    useInput((input, key) => {
        if (input === "q" && key.ctrl) exit()
    })

    const handlePermission = (allowed: boolean) => {
        permResolveRef.current?.(allowed)
        permResolveRef.current = null
        setPermDialog(null)
    }

    const handleSubmit = async (text: string) => {
        // Handle exit
        if (text === "exit") {
            exit()
            return
        }

        // Create user message and add to session
        const userMsg: Message.Info = {
            id: Identifier.ascending("msg"),
            sessionId,
            role: "user",
            parts: [{ type: "text", text }],
            time: { created: Date.now() },
            metadata: {},
        }
        Session.addMessage(sessionId, userMsg)
        setMessages(prev => [...prev, { role: "user", text }])

        // Run agent loop
        setStatus("thinking")
        streamRef.current = ""
        setStreamText("")

        try {
            await SessionPrompt.loop(sessionId)
        } catch (error) {
            setMessages(prev => [...prev, {
                role: "error",
                text: error instanceof Error ? error.message : String(error),
            }])
        }

        // Finalize: move streamed text to messages
        if (streamRef.current) {
            setMessages(prev => [...prev, { role: "assistant", text: streamRef.current }])
        }
        streamRef.current = ""
        setStreamText("")
        setStatus("idle")
    }

    const model = process.env.EPH_MODEL ?? "deepseek/deepseek-chat"

    return (
        <Box flexDirection="column" height={process.stdout.rows}>
            <Messages messages={messages} streamText={streamText} />
            <StatusBar status={status} model={model} />
            {permDialog ? (
                <PermissionDialog
                    toolName={permDialog.toolName}
                    args={permDialog.args}
                    onRespond={handlePermission}
                />
            ) : (
                <Input onSubmit={handleSubmit} disabled={status !== "idle"} />
            )}
        </Box>
    )
}

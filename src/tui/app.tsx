import React, { useState, useEffect, useRef } from "react"
import { Box, useApp, useInput } from "ink"

import { Session } from "../session/session"
import { SessionPrompt } from "../session/prompt"
import { SessionProcessor } from "../session/processor"
import { Message } from "../session/message"
import { Identifier } from "../util/id"
import { Bus } from "../bus/bus"
import { Permission } from "../permission/permission"

import { Messages, type DisplayMessage, createDisplayMessage } from "./messages"
import { Input } from "./input"
import { StatusBar, type AppStatus } from "./status"
import { PermissionDialog } from "./permission"
import { Banner } from "./banner"
import { ToolRegistry } from "../tool/registry"
import { Log } from "../util/log"
import { useTerminalSize } from "./use-terminal-size"

const DOUBLE_PRESS_MS = 3000

export function App() {
    const { exit } = useApp()
    const [sessionId] = useState(() => Session.create().id)
    const [messages, setMessages] = useState<DisplayMessage[]>([])
    const [streamText, setStreamText] = useState("")
    const [status, setStatus] = useState<AppStatus>("idle")
    const [permDialog, setPermDialog] = useState<{ toolName: string; args: unknown } | null>(null)
    const permResolveRef = useRef<((allowed: boolean) => void) | null>(null)
    const streamRef = useRef("")
    const abortRef = useRef<AbortController>(new AbortController())
    const lastCtrlCRef = useRef<number>(0)
    const [totalTokens, setTotalTokens] = useState({ input: 0, output: 0 })
    const { rows: termRows, columns: termColumns } = useTerminalSize()
    const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Subscribe to Bus events with cleanup — filter by sessionId
    useEffect(() => {
        const unsub1 = Bus.subscribe(SessionProcessor.TextDelta, (p) => {
            if (p.sessionId !== sessionId) return
            streamRef.current += p.text
            // Throttle React renders to ~30fps via setTimeout.
            // Without this, for-await may yield many events in the same microtask,
            // React batches all setStreamText calls, and UI never updates during streaming.
            if (!flushTimerRef.current) {
                flushTimerRef.current = setTimeout(() => {
                    setStreamText(streamRef.current)
                    flushTimerRef.current = null
                }, 32)
            }
        })
        const unsub2 = Bus.subscribe(SessionProcessor.ToolStart, (p) => {
            if (p.sessionId !== sessionId) return
            setStatus("tool")
            setMessages(prev => [...prev, createDisplayMessage("tool", `▶ ${p.toolName}...`)])
        })
        const unsub3 = Bus.subscribe(SessionProcessor.ToolEnd, (p) => {
            if (p.sessionId !== sessionId) return
            setStatus("thinking")
            if (p.error) {
                setMessages(prev => [...prev, createDisplayMessage("error", `✗ ${p.toolName}: ${p.error}`)])
            } else {
                const preview = (p.result ?? "").slice(0, 200)
                setMessages(prev => [...prev, createDisplayMessage("tool", `✓ ${p.toolName}: ${preview}`)])
            }
        })
        const unsub4 = Bus.subscribe(SessionProcessor.UsageUpdate, (p) => {
            if (p.sessionId !== sessionId) return
            setTotalTokens(prev => ({ input: prev.input + p.input, output: prev.output + p.output }))
        })
        return () => {
            unsub1(); unsub2(); unsub3(); unsub4()
            if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
        }
    }, [])

    // Register Permission handler with cleanup
    // Note: concurrent permission requests won't happen — processor executes tools sequentially
    useEffect(() => {
        Permission.setAskHandler(async (toolName, args) => {
            return new Promise<boolean>((resolve) => {
                permResolveRef.current = resolve
                setPermDialog({ toolName, args })
            })
        })
        return () => { Permission.setAskHandler(null) }
    }, [])

    // Ctrl+C: first press = interrupt loop, second press within 3s = exit
    // Ctrl+Q: always exit (when not in permission dialog)
    useInput((input, key) => {
        if (key.ctrl && input === "c") {
            const now = Date.now()
            if (status !== "idle") {
                // Interrupt running agent loop
                abortRef.current.abort()
                // Also resolve any pending permission as deny
                if (permResolveRef.current) {
                    permResolveRef.current(false)
                    permResolveRef.current = null
                    setPermDialog(null)
                }
                setMessages(prev => [...prev, createDisplayMessage("error", "Interrupted by user (Ctrl+C)")])
                lastCtrlCRef.current = now
            } else if (now - lastCtrlCRef.current < DOUBLE_PRESS_MS) {
                // Double Ctrl+C while idle → exit
                exit()
            } else {
                // First Ctrl+C while idle → show hint
                lastCtrlCRef.current = now
                setMessages(prev => [...prev, createDisplayMessage("error", "Press Ctrl+C again to exit")])
            }
            return
        }
        if (key.ctrl && input === "q" && !permDialog) exit()
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
        setMessages(prev => [...prev, createDisplayMessage("user", text)])

        // Run agent loop with abort support
        abortRef.current = new AbortController()
        setStatus("thinking")
        streamRef.current = ""
        setStreamText("")

        Log.info(`[handleSubmit] starting loop for: "${text.slice(0, 50)}"`)
        try {
            await SessionPrompt.loop(sessionId, undefined, abortRef.current.signal)
            Log.info("[handleSubmit] loop finished normally")
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error)
            Log.error(`[handleSubmit] loop error: ${msg}`)
            // AbortError is expected when user presses Ctrl+C — don't show as error
            if (!abortRef.current.signal.aborted) {
                setMessages(prev => [...prev, createDisplayMessage("error", msg)])
            }
        } finally {
            // Cancel any pending flush timer
            if (flushTimerRef.current) {
                clearTimeout(flushTimerRef.current)
                flushTimerRef.current = null
            }
            const finalText = streamRef.current
            streamRef.current = ""
            setStreamText("")
            if (finalText) {
                setMessages(prev => [...prev, createDisplayMessage("assistant", finalText)])
            }
            setStatus("idle")
        }
    }

    const model = process.env.EPH_MODEL ?? "deepseek/deepseek-chat"
    const showBanner = messages.length === 0 && !streamText

    return (
        <Box flexDirection="column" height={termRows}>
            {showBanner ? (
                <Banner model={model} toolCount={ToolRegistry.all().length} />
            ) : (
                <Messages messages={messages} streamText={streamText} reserveRows={permDialog ? 1 : 0} termRows={termRows} termColumns={termColumns} />
            )}
            {permDialog && (
                <PermissionDialog
                    toolName={permDialog.toolName}
                    args={permDialog.args}
                    onRespond={handlePermission}
                />
            )}
            <StatusBar status={status} model={model} tokens={totalTokens} />
            <Input onSubmit={handleSubmit} disabled={status !== "idle"} />
        </Box>
    )
}

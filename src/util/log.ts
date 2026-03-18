import * as fs from "fs"
import * as path from "path"

/** Simple file logger — writes to ~/.eph-code/debug.log instead of stdout/stderr.
 *  Critical for TUI mode: console.error corrupts Ink's terminal rendering. */
export namespace Log {
    const LOG_DIR = path.join(process.env.HOME ?? "/tmp", ".eph-code")
    const LOG_FILE = path.join(LOG_DIR, "debug.log")
    let initialized = false

    function init() {
        if (initialized) return
        try {
            fs.mkdirSync(LOG_DIR, { recursive: true })
            // Truncate log file on startup (keep only current session)
            fs.writeFileSync(LOG_FILE, `--- eph-code started at ${new Date().toISOString()} ---\n`)
            initialized = true
        } catch {
            // If we can't create log dir, silently disable logging
        }
    }

    function write(level: string, message: string) {
        init()
        if (!initialized) return
        const timestamp = new Date().toISOString().slice(11, 23) // HH:mm:ss.SSS
        const line = `[${timestamp}] ${level} ${message}\n`
        try {
            fs.appendFileSync(LOG_FILE, line)
        } catch {
            // Silently ignore write failures
        }
    }

    export function info(message: string) { write("INFO", message) }
    export function error(message: string) { write("ERROR", message) }
    export function warn(message: string) { write("WARN", message) }
    export function debug(message: string) { write("DEBUG", message) }

    /** Get the log file path (for display in TUI) */
    export function getLogPath(): string { return LOG_FILE }
}

import { useState, useEffect } from "react"

/** Hook that tracks terminal dimensions and updates on resize */
export function useTerminalSize() {
    const [size, setSize] = useState({
        rows: process.stdout.rows ?? 24,
        columns: process.stdout.columns ?? 80,
    })

    useEffect(() => {
        const onResize = () => {
            setSize({
                rows: process.stdout.rows ?? 24,
                columns: process.stdout.columns ?? 80,
            })
        }
        process.stdout.on("resize", onResize)
        return () => { process.stdout.off("resize", onResize) }
    }, [])

    return size
}

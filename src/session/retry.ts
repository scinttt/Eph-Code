export namespace SessionRetry{
    // Check if an error is retryable (429, 5xx network errors)
    export function retryable(error: unknown): boolean{
        if(error instanceof Error){
        const msg = error.message
        if(msg.includes("429") || msg.includes("rate limit"))
            return true
        if (msg.includes("500") || msg.includes("502") || msg.includes("503")) 
            return true
        if (msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT") || msg.includes("fetch failed"))
            return true
        }

        return false
    }

    // Calculate delay in ms: retry-after header or exponential backoff 2s x 2^attempt, max 30s
    export function delay(attempt: number, error?: unknown): number{
        // Check for retry-after header in error
        if(error && typeof error === "object" && "responseHeaders" in error){
            const headers = (error as any).responseHeaders
            const retryAfter = headers?.["retry-after"]
            if (retryAfter) {
                const seconds = parseInt(retryAfter, 10)
                if (!isNaN(seconds)) return seconds * 1000
            }
        }
        
        // Exponential backoff: 2s, 4s, 8s, 16s, max 30s
        return Math.min(2000 * Math.pow(2, attempt), 30000)
    }

    /** Sleep for a given number of milliseconds */
    export function sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }
}
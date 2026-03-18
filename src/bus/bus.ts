import { BusEvent } from "./event"

export namespace Bus {
    /** Map of event type → array of callbacks hooked to that event */
    const subscriptions = new Map<string, Array<(payload: any) => void>>()

    /** Hook a callback to a specific event type. Returns an unsubscribe function. */
    export function subscribe<D extends BusEvent.Definition>(
        def: D,
        callback: (payload: BusEvent.Payload<D>) => void
    ): () => void {
        const list = subscriptions.get(def.type) ?? []
        list.push(callback)
        subscriptions.set(def.type, list)
        return () => {
            const current = subscriptions.get(def.type)
            if (current) {
                const idx = current.indexOf(callback)
                if (idx !== -1) current.splice(idx, 1)
            }
        }
    }

    /** Execute all callbacks hooked to this event type, plus wildcard callbacks */
    export async function publish<D extends BusEvent.Definition>(
        def: D,
        payload: BusEvent.Payload<D>
    ) {
        const list = subscriptions.get(def.type) ?? []
        const all = subscriptions.get("*") ?? []
        for (const callback of all){
            try { 
                callback({type: def.type, payload}) 
            } catch (e) { 
                console.error("[Bus] subscriber error:", e) 
            }
        }
            
        for (const callback of list){
            try { 
                callback(payload) 
            } catch (e) { 
                console.error("[Bus] subscriber error:", e) 
            }
        }
    }

    /** Hook a callback to all events regardless of type. Returns an unsubscribe function. */
    export function subscribeAll(callback: (payload: any) => void): () => void {
        const list = subscriptions.get("*") ?? []
        list.push(callback)
        subscriptions.set("*", list)
        return () => {
            const current = subscriptions.get("*")
            if (current) {
                const idx = current.indexOf(callback)
                if (idx !== -1) current.splice(idx, 1)
            }
        }
    }
}

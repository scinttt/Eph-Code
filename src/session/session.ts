import { Identifier } from "../util/id"
import { Message } from "./message"

/** In-memory session management. Stores sessions and their messages. Will migrate to SQLite later. */
export namespace Session {
    export type Info = {
        id: string
        createdAt: number
    }

    /** All sessions, keyed by session ID */
    const sessions = new Map<string, Info>()
    /** All messages, keyed by session ID */
    const messages = new Map<string, Message.Info[]>()

    /** Create a new session and initialize its empty message list */
    export function create(): Info{
        const session: Info = {id: Identifier.ascending("session"), createdAt: Date.now()}
        sessions.set(session.id, session)
        messages.set(session.id, [])
        return session
    }

    /** Get a session by ID */
    export function get(sessionId: string): Info | undefined{
        return sessions.get(sessionId)
    }

    /** Get all messages in a session */
    export function getMessages(sessionId: string): Message.Info[] | undefined{
        return messages.get(sessionId)
    }

    /** Append a message to a session */
    export function addMessage(sessionId: string, msg: Message.Info){
        const messageList = messages.get(sessionId) ?? []
        messageList.push(msg)
        messages.set(sessionId, messageList)
    }
}

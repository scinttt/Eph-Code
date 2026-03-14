import type { ZodType, z } from "zod"

export namespace BusEvent {
  /** Map of all defined events, auto-collected on each define() call */
  const registry = new Map<string, Definition>()

  /** Create a new event type with a name and payload schema, and register it */
  export function define<Type extends string, Properties extends ZodType>(
    type: Type,
    properties: Properties,
  ): Definition<Type, Properties> {
    registry.set(type, {type, properties})
    return {type, properties}
  }

  /** Get all defined events */
  export function all(): Map<string, Definition> {
    return registry
  }

  /** Helper type: extract the payload type from a Definition */
  export type Payload<D extends Definition> = D extends Definition<any, infer P> ? z.infer<P> : never

  /** An event definition: event name + Zod schema describing callback input */
  export interface Definition<
    Type extends string = string,
    Properties extends ZodType = ZodType,
  > {
    type: Type
    properties: Properties
  }
}

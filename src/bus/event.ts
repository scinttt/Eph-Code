import type { ZodType, z } from "zod"

export namespace BusEvent {
  /** All registered event definitions */
  const registry = new Map<string, Definition>()

  /** Register a new event type with its payload schema */
  export function define<Type extends string, Properties extends ZodType>(
    type: Type,
    properties: Properties,
  ): Definition<Type, Properties> {
    registry.set(type, {type, properties})
    return {type, properties}
  }

  /** Return all registered event definitions */
  export function all(): Map<string, Definition> {
    return registry
  }

  /** Extract the payload type from a Definition */
  export type Payload<D extends Definition> = D extends Definition<any, infer P> ? z.infer<P> : never

  export interface Definition<
    Type extends string = string,
    Properties extends ZodType = ZodType,
  > {
    type: Type
    properties: Properties
  }
}

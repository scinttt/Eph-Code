import { ulid } from "ulid"

  export namespace Identifier {
    export function ascending(prefix: string): string {
      return `${prefix}_${ulid()}`
    }
  }
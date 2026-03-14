  export namespace Token {
    export function estimate(text: string): number {
      return Math.round(text.length / 4)
    }
  }

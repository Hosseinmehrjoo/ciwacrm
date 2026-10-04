declare module 'jssip' {
  export class WebSocketInterface {
    constructor(url: string)
  }

  export class UA {
    constructor(configuration: Record<string, unknown>)
    start(): void
    stop(): void
    call(target: string, options?: Record<string, unknown>): any
    on(event: string, callback: (...args: any[]) => void): void
  }

  const JsSIP: {
    WebSocketInterface: typeof WebSocketInterface
    UA: typeof UA
  }
  export default JsSIP
}

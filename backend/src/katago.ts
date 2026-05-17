import { encodeGtpCommand, parseGtpResponse, type GtpResponse } from './gtp'

export interface KataGoConfig {
  katagoPath: string
  modelPath: string
  configPath: string
}

interface PendingCommand {
  resolve: (response: GtpResponse) => void
  reject: (error: Error) => void
}

export class KataGoManager {
  private proc: ReturnType<typeof Bun.spawn> | null = null
  private commandId = 0
  private pending = new Map<number, PendingCommand>()
  private buffer = ''
  private exitCallbacks: (() => void)[] = []

  isRunning(): boolean {
    return this.proc !== null && this.proc.exitCode === null
  }

  async start(config: KataGoConfig): Promise<void> {
    if (this.isRunning()) {
      throw new Error('KataGo is already running')
    }

    this.proc = Bun.spawn(
      [config.katagoPath, 'gtp', '-model', config.modelPath, '-config', config.configPath],
      {
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe',
      }
    )

    this.readStdout()
    this.handleExit()
  }

  async stop(): Promise<void> {
    if (!this.proc) return

    try {
      this.proc.stdin.write('quit\n')
      await this.proc.stdin.flush()
      // Give it a moment to exit gracefully
      const timeout = Bun.sleep(2000)
      const exit = this.proc.exited
      await Promise.race([exit, timeout])
    } catch {
      // ignore
    }

    if (this.proc.exitCode === null) {
      this.proc.kill()
    }

    this.proc = null
    this.rejectAllPending('KataGo process stopped')
  }

  async sendCommand(command: string, args: string[]): Promise<GtpResponse> {
    if (!this.isRunning()) {
      throw new Error('KataGo is not running')
    }

    const id = this.commandId++
    const cmdStr = encodeGtpCommand(id, command, args)

    return new Promise<GtpResponse>((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.proc!.stdin.write(cmdStr)
      this.proc!.stdin.flush()
    })
  }

  onExit(callback: () => void): void {
    this.exitCallbacks.push(callback)
  }

  private async readStdout() {
    if (!this.proc) return

    const reader = this.proc.stdout.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        this.buffer += decoder.decode(value, { stream: true })

        // Process all complete responses in the buffer
        let result = parseGtpResponse(this.buffer)
        while (result) {
          this.buffer = this.buffer.substring(result.consumed)
          const pending = this.pending.get(result.response.id)
          if (pending) {
            this.pending.delete(result.response.id)
            pending.resolve(result.response)
          }
          result = parseGtpResponse(this.buffer)
        }
      }
    } catch {
      // Stream closed
    }
  }

  private handleExit() {
    if (!this.proc) return

    this.proc.exited.then(() => {
      this.proc = null
      this.rejectAllPending('KataGo process exited')
      for (const cb of this.exitCallbacks) cb()
    })
  }

  private rejectAllPending(reason: string) {
    for (const [id, pending] of this.pending) {
      pending.reject(new Error(reason))
    }
    this.pending.clear()
  }
}

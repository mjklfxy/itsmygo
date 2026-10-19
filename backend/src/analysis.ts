/**
 * KataGo analysis engine client.
 *
 * The analysis engine is a separate process from the GTP engine: it speaks JSON
 * lines on stdin/stdout instead of GTP commands, and it reports a real
 * `rootInfo.winrate` / `rootInfo.scoreLead` produced by MCTS + the neural net.
 *
 * Query shape (one JSON object per line):
 *   {"id":"...","moves":[["B","D4"]],"rules":"chinese","komi":7.5,
 *    "boardXSize":19,"boardYSize":19}
 *
 * Response shape: one JSON object per line, matched by `id`. The engine may emit
 * intermediate objects with `isDuringSearch: true`; only the final one counts.
 */

export interface AnalysisConfig {
  katagoPath: string
  modelPath: string
  configPath: string
  /**
   * Optional full argv override. When present it is spawned verbatim instead of
   * building `<katagoPath> analysis -model ... -config ...`. Useful for wrapper
   * scripts, GPU environment setup, and tests.
   */
  argv?: string[]
}

export interface AnalyzeInput {
  /** GTP-coloured move list, passes expressed as the literal "pass". */
  moves: [string, string][]
  komi: number
  boardSize: number
  rules?: string
  /** MCTS playouts; omit to use the engine config default. */
  maxVisits?: number
}

export interface AnalysisResult {
  /** Win rate for black, 0..1. */
  blackWinRate: number
  /** Score lead for black in points (positive = black ahead). */
  blackLead: number
  /** Score lead for black at one standard deviation, if reported. */
  blackLeadStdev: number | null
  visits: number
  /** Which player the engine considered to move. */
  currentPlayer: 'B' | 'W'
  /** Best moves reported by the engine, strongest first. */
  moves: {
    move: string
    winRate: number
    scoreLead: number
    visits: number
    order: number
  }[]
}

interface PendingQuery {
  resolve: (value: AnalysisResult) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const QUERY_TIMEOUT_MS = 30_000

/** KataGo reports winrate/scoreLead for the player to move; normalise to black. */
function toBlackPerspective(
  winRate: number,
  scoreLead: number,
  currentPlayer: 'B' | 'W',
): { blackWinRate: number; blackLead: number } {
  return currentPlayer === 'B'
    ? { blackWinRate: winRate, blackLead: scoreLead }
    : { blackWinRate: 1 - winRate, blackLead: -scoreLead }
}

export class AnalysisEngine {
  private proc: ReturnType<typeof Bun.spawn> | null = null
  private pending = new Map<string, PendingQuery>()
  private buffer = ''
  private nextId = 0
  private stderrTail: string[] = []

  isRunning(): boolean {
    return this.proc !== null && this.proc.exitCode === null
  }

  async start(config: AnalysisConfig): Promise<void> {
    if (this.isRunning()) throw new Error('Analysis engine is already running')

    const argv = config.argv?.length
      ? config.argv
      : [
          config.katagoPath,
          'analysis',
          '-model',
          config.modelPath,
          '-config',
          config.configPath,
        ]

    this.proc = Bun.spawn(argv, {
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
    })

    this.stderrTail = []
    this.readStdout()
    this.readStderr()
    this.handleExit()
  }

  async stop(): Promise<void> {
    if (!this.proc) return
    const proc = this.proc

    try {
      proc.stdin.end()
    } catch {
      // already closed
    }

    const timeout = Bun.sleep(2000)
    await Promise.race([proc.exited, timeout])

    if (proc.exitCode === null) proc.kill()
    this.proc = null
    this.rejectAll('Analysis engine stopped')
  }

  /** Returns the tail of the engine's stderr, useful when startup fails. */
  getStderrTail(lines = 5): string {
    return this.stderrTail.slice(-lines).join('\n')
  }

  async analyze(input: AnalyzeInput): Promise<AnalysisResult> {
    if (!this.isRunning()) throw new Error('Analysis engine is not running')

    const id = String(this.nextId++)
    const query: Record<string, unknown> = {
      id,
      moves: input.moves,
      rules: input.rules ?? 'chinese',
      komi: input.komi,
      boardXSize: input.boardSize,
      boardYSize: input.boardSize,
      includeOwnership: false,
    }
    if (input.maxVisits) query.maxVisits = input.maxVisits

    return new Promise<AnalysisResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Analysis timed out after ${QUERY_TIMEOUT_MS}ms`))
      }, QUERY_TIMEOUT_MS)

      this.pending.set(id, { resolve, reject, timer })
      try {
        this.proc!.stdin.write(`${JSON.stringify(query)}\n`)
        this.proc!.stdin.flush()
      } catch (e) {
        clearTimeout(timer)
        this.pending.delete(id)
        reject(e instanceof Error ? e : new Error(String(e)))
      }
    })
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

        let newline = this.buffer.indexOf('\n')
        while (newline !== -1) {
          const line = this.buffer.slice(0, newline).trim()
          this.buffer = this.buffer.slice(newline + 1)
          if (line) this.handleLine(line)
          newline = this.buffer.indexOf('\n')
        }
      }
    } catch {
      // stream closed
    }
  }

  private async readStderr() {
    if (!this.proc) return
    const reader = this.proc.stderr.getReader()
    const decoder = new TextDecoder()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (line.trim()) {
            this.stderrTail.push(line)
            if (this.stderrTail.length > 50) this.stderrTail.shift()
          }
        }
      }
    } catch {
      // stream closed
    }
  }

  private handleLine(line: string) {
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(line)
    } catch {
      return
    }

    // Intermediate search reports are not the final answer.
    if (payload.isDuringSearch === true) return

    const id = String(payload.id ?? '')
    const pending = this.pending.get(id)
    if (!pending) return

    if (typeof payload.error === 'string' && payload.error) {
      clearTimeout(pending.timer)
      this.pending.delete(id)
      pending.reject(new Error(payload.error))
      return
    }

    const rootInfo = payload.rootInfo as
      | { winrate?: number; scoreLead?: number; scoreStdev?: number; visits?: number; currentPlayer?: string }
      | undefined
    if (!rootInfo || typeof rootInfo.winrate !== 'number') {
      // Still searching, or an unusable shape; leave the query pending.
      return
    }

    const currentPlayer: 'B' | 'W' = rootInfo.currentPlayer === 'W' ? 'W' : 'B'
    const scoreLead = typeof rootInfo.scoreLead === 'number' ? rootInfo.scoreLead : 0
    const { blackWinRate, blackLead } = toBlackPerspective(
      rootInfo.winrate,
      scoreLead,
      currentPlayer,
    )

    const moveInfos = Array.isArray(payload.moveInfos) ? payload.moveInfos : []
    const moves = moveInfos
      .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
      .map((m) => {
        const movePlayer: 'B' | 'W' = currentPlayer
        const mw = typeof m.winrate === 'number' ? m.winrate : 0
        const ms = typeof m.scoreLead === 'number' ? m.scoreLead : 0
        const norm = toBlackPerspective(mw, ms, movePlayer)
        return {
          move: String(m.move ?? ''),
          winRate: norm.blackWinRate,
          scoreLead: norm.blackLead,
          visits: typeof m.visits === 'number' ? m.visits : 0,
          order: typeof m.order === 'number' ? m.order : 0,
        }
      })
      .sort((a, b) => a.order - b.order)

    clearTimeout(pending.timer)
    this.pending.delete(id)
    pending.resolve({
      blackWinRate,
      blackLead,
      blackLeadStdev:
        typeof rootInfo.scoreStdev === 'number' ? rootInfo.scoreStdev : null,
      visits: typeof rootInfo.visits === 'number' ? rootInfo.visits : 0,
      currentPlayer,
      moves,
    })
  }

  private handleExit() {
    if (!this.proc) return
    this.proc.exited.then(() => {
      this.proc = null
      this.rejectAll('Analysis engine exited')
    })
  }

  private rejectAll(reason: string) {
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(new Error(reason))
    }
    this.pending.clear()
  }
}

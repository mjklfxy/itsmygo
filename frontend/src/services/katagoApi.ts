const API_BASE = ''

export interface KataGoConfig {
  katagoPath?: string
  modelPath: string
  configPath: string
  /** Optional full argv override for the analysis engine. */
  argv?: string[]
}

/**
 * Parses a JSON response, turning proxy and network failures into readable errors.
 *
 * Vite's dev proxy answers 502 with an empty body when the backend is down, so a bare
 * `res.json()` threw "Unexpected end of JSON input" and hid the actual cause.
 */
async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) {
    throw new Error(
      res.status === 502 || res.status === 504
        ? `后端未启动（${res.status}）。请先运行：cd backend && bun run dev`
        : `空响应（HTTP ${res.status}）`,
    )
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`响应不是合法 JSON（HTTP ${res.status}）：${text.slice(0, 120)}`)
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return readJson<T>(res)
}

export async function startKatago(
  config: KataGoConfig,
): Promise<{ success: boolean; error?: string }> {
  return post('/api/katago/start', config)
}

export async function stopKatago(): Promise<void> {
  await fetch(`${API_BASE}/api/katago/stop`, { method: 'POST' })
}

export async function requestKatagoMove(
  boardSize: number,
  moves: [string, string][],
  color: string,
  komi: number,
): Promise<{ success: boolean; move: string; error?: string }> {
  return post('/api/move', { boardSize, moves, color, komi })
}

export async function checkKatagoHealth(): Promise<{
  status: string
  katagoRunning: boolean
  analysisRunning: boolean
}> {
  const res = await fetch(`${API_BASE}/api/health`)
  return readJson(res)
}

/* ---- Analysis engine (real win rate / score lead from MCTS + neural net) ---- */

export interface AnalysisMove {
  move: string
  winRate: number
  scoreLead: number
  visits: number
  order: number
}

export interface AnalysisResponse {
  success: boolean
  error?: string
  /** Win rate for black, 0..1. */
  blackWinRate?: number
  /** Score lead for black in points. */
  blackLead?: number
  blackLeadStdev?: number | null
  visits?: number
  currentPlayer?: 'B' | 'W'
  moves?: AnalysisMove[]
}

export async function startAnalysis(
  config: KataGoConfig,
): Promise<{ success: boolean; error?: string; stderr?: string }> {
  return post('/api/analysis/start', config)
}

export async function stopAnalysis(): Promise<void> {
  await fetch(`${API_BASE}/api/analysis/stop`, { method: 'POST' })
}

export async function analyzePosition(
  boardSize: number,
  moves: [string, string][],
  komi: number,
  maxVisits?: number,
): Promise<AnalysisResponse> {
  return post('/api/analyze', { boardSize, moves, komi, maxVisits })
}

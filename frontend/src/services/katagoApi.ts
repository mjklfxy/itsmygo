const API_BASE = ''

export interface KataGoConfig {
  katagoPath?: string
  modelPath: string
  configPath: string
}

export async function startKatago(config: KataGoConfig): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/katago/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  return res.json()
}

export async function stopKatago(): Promise<void> {
  await fetch(`${API_BASE}/api/katago/stop`, { method: 'POST' })
}

export async function requestKatagoMove(
  boardSize: number,
  moves: [string, string][],
  color: string,
  komi: number
): Promise<{ success: boolean; move: string; error?: string }> {
  const res = await fetch(`${API_BASE}/api/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardSize, moves, color, komi }),
  })
  return res.json()
}

export async function checkKatagoHealth(): Promise<{ status: string; katagoRunning: boolean }> {
  const res = await fetch(`${API_BASE}/api/health`)
  return res.json()
}

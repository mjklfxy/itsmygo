/**
 * End-to-end test: spawn the real backend server against the fake analysis engine
 * and exercise the HTTP API the frontend actually calls.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'

const FAKE_ENGINE = fileURLToPath(new URL('./fake-analysis.mjs', import.meta.url))
const PORT = 3987
const BASE = `http://127.0.0.1:${PORT}`

let server: ReturnType<typeof Bun.spawn>

async function waitForServer(timeoutMs = 8000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/health`)
      if (res.ok) return
    } catch {
      // not up yet
    }
    await Bun.sleep(100)
  }
  throw new Error('server did not start')
}

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeAll(async () => {
  // Boot the server on an isolated port with the fake engine argv pre-configured.
  const script = `
    import { AnalysisEngine } from './src/analysis.ts'
    import { KataGoManager } from './src/katago.ts'
    import { handleRequest } from './src/routes.ts'
    const katago = new KataGoManager()
    const analysis = new AnalysisEngine()
    Bun.serve({ port: ${PORT}, fetch: (req) => handleRequest(req, katago, analysis) })
    console.log('ready')
  `
  server = Bun.spawn([process.execPath, '-e', script], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  await waitForServer()
})

afterAll(() => {
  server?.kill()
})

describe('analysis HTTP API', () => {
  test('health reports both engines', async () => {
    const res = await fetch(`${BASE}/api/health`)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.analysisRunning).toBe(false)
    expect(body.katagoRunning).toBe(false)
  })

  test('analyze returns 503 before the engine is started', async () => {
    const res = await post('/api/analyze', {
      boardSize: 19,
      moves: [['B', 'D4']],
      komi: 7.5,
    })
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.error).toContain('not running')
  })

  test('start -> analyze -> stop round trip', async () => {
    const startRes = await post('/api/analysis/start', {
      katagoPath: 'node',
      modelPath: 'unused',
      configPath: 'unused',
      argv: [process.execPath, FAKE_ENGINE],
    })
    const startBody = await startRes.json()
    expect(startBody.success).toBe(true)

    const health = await (await fetch(`${BASE}/api/health`)).json()
    expect(health.analysisRunning).toBe(true)

    const res = await post('/api/analyze', {
      boardSize: 19,
      moves: [
        ['B', 'D4'],
        ['W', 'Q16'],
        ['B', 'D16'],
      ],
      komi: 7.5,
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.currentPlayer).toBe('W')
    expect(body.blackWinRate).toBeCloseTo(0.75, 5)
    expect(body.blackLead).toBeCloseTo(12.5, 5)
    expect(body.visits).toBe(400)
    expect(body.moves).toHaveLength(2)

    const stopRes = await post('/api/analysis/stop', {})
    expect((await stopRes.json()).success).toBe(true)

    const after = await (await fetch(`${BASE}/api/health`)).json()
    expect(after.analysisRunning).toBe(false)
  })

  test('rejects a malformed analyze request', async () => {
    await post('/api/analysis/start', {
      katagoPath: 'node',
      modelPath: 'unused',
      configPath: 'unused',
      argv: [process.execPath, FAKE_ENGINE],
    })
    const res = await post('/api/analyze', { komi: 7.5 })
    expect(res.status).toBe(400)
    await post('/api/analysis/stop', {})
  })
})

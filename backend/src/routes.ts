import type { KataGoManager, KataGoConfig } from './katago'

const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    return await req.json()
  } catch {
    return {}
  }
}

export async function handleRequest(req: Request, katago: KataGoManager): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  const url = new URL(req.url)

  // GET /api/health
  if (url.pathname === '/api/health' && req.method === 'GET') {
    return json({ status: 'ok', katagoRunning: katago.isRunning() })
  }

  // POST /api/katago/start
  if (url.pathname === '/api/katago/start' && req.method === 'POST') {
    const body = await readBody(req)
    const config: KataGoConfig = {
      katagoPath: (body.katagoPath as string) || 'katago',
      modelPath: (body.modelPath as string) || '',
      configPath: (body.configPath as string) || '',
    }
    try {
      await katago.start(config)
      return json({ success: true })
    } catch (e) {
      return json({ success: false, error: String(e) }, 500)
    }
  }

  // POST /api/katago/stop
  if (url.pathname === '/api/katago/stop' && req.method === 'POST') {
    await katago.stop()
    return json({ success: true })
  }

  // POST /api/gtp — raw GTP command
  if (url.pathname === '/api/gtp' && req.method === 'POST') {
    if (!katago.isRunning()) {
      return json({ success: false, error: 'KataGo is not running' }, 503)
    }
    const body = await readBody(req)
    const command = body.command as string
    const args = (body.args as string[]) || []
    if (!command) {
      return json({ success: false, error: 'Missing command' }, 400)
    }
    try {
      const result = await katago.sendCommand(command, args)
      return json(result)
    } catch (e) {
      return json({ success: false, error: String(e) }, 500)
    }
  }

  // POST /api/move — high-level: setup position, request genmove
  if (url.pathname === '/api/move' && req.method === 'POST') {
    if (!katago.isRunning()) {
      return json({ success: false, error: 'KataGo is not running' }, 503)
    }
    const body = await readBody(req)
    const { boardSize, moves, color, komi } = body as {
      boardSize: number
      moves: [string, string][]
      color: string
      komi: number
    }

    try {
      await katago.sendCommand('boardsize', [String(boardSize)])
      await katago.sendCommand('clear_board', [])
      await katago.sendCommand('komi', [String(komi)])

      for (const [moveColor, coord] of moves) {
        await katago.sendCommand('play', [moveColor, coord])
      }

      const result = await katago.sendCommand('genmove', [color])
      if (!result.success) {
        return json({ success: false, error: result.error }, 500)
      }

      return json({ success: true, move: result.data })
    } catch (e) {
      return json({ success: false, error: String(e) }, 500)
    }
  }

  // POST /api/analyze — position analysis
  if (url.pathname === '/api/analyze' && req.method === 'POST') {
    if (!katago.isRunning()) {
      return json({ success: false, error: 'KataGo is not running' }, 503)
    }
    const body = await readBody(req)
    const { boardSize, moves, komi } = body as {
      boardSize: number
      moves: [string, string][]
      komi: number
    }

    try {
      await katago.sendCommand('boardsize', [String(boardSize)])
      await katago.sendCommand('clear_board', [])
      await katago.sendCommand('komi', [String(komi)])

      for (const [moveColor, coord] of moves) {
        await katago.sendCommand('play', [moveColor, coord])
      }

      const result = await katago.sendCommand('final_score', [])
      return json({ success: true, score: result.data })
    } catch (e) {
      return json({ success: false, error: String(e) }, 500)
    }
  }

  return json({ error: 'Not found' }, 404)
}

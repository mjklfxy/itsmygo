import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../game/types'
import { moveToGtp } from '../game/gtpCoords'
import { analyzePosition, type AnalysisMove } from '../services/katagoApi'

export interface AiAnalysis {
  /** Win rate for black, 0..1, from the engine's MCTS search. */
  blackWinRate: number
  /** Score lead for black in points. */
  blackLead: number
  visits: number
  bestMoves: AnalysisMove[]
  /** Position signature this result belongs to, used to discard stale results. */
  signature: string
}

export interface KataGoAnalysisState {
  /** Latest engine evaluation for the current position, or null. */
  analysis: AiAnalysis | null
  /** Why the engine is unavailable, when it is. Shown in the panel. */
  error: string | null
  /** True while a query for the current position is in flight. */
  pending: boolean
}

const DEBOUNCE_MS = 350
const MAX_VISITS = 400

function isKatagoMode(mode: GameState['aiMode']): boolean {
  return mode === 'katago-black' || mode === 'katago-white'
}

/**
 * Converts the move list to KataGo's analysis format.
 *
 * Passes must be kept: the analysis engine replays the sequence and derives whose
 * turn it is from the move count, so dropping a pass would silently swap colours
 * for every subsequent move.
 */
export function buildAnalysisMoves(state: GameState): [string, string][] {
  return state.moves.map((m) => [
    m.player === 1 ? 'B' : 'W',
    m.pass ? 'pass' : moveToGtp(m.x, m.y, state.size),
  ])
}

/**
 * Requests a real position evaluation from the KataGo analysis engine.
 *
 * Returns null analysis outside KataGo modes, or when the engine is unreachable, so
 * the panel can fall back to the local heuristic estimate. `error` is surfaced so the
 * fallback is visible instead of looking like a real engine reading.
 */
export function useKataGoAnalysis(
  state: GameState,
  enabled: boolean,
): KataGoAnalysisState {
  const [result, setResult] = useState<AiAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const requestRef = useRef(0)

  const active =
    enabled &&
    isKatagoMode(state.aiMode) &&
    state.mode === 'play' &&
    !state.gameOver

  // The engine replays the whole game per query, so only the move count matters.
  const moveCount = state.moves.length
  const size = state.size
  const komi = state.komi
  const signature = `${size}|${komi}|${moveCount}`

  useEffect(() => {
    if (!active) return

    const requestId = ++requestRef.current
    const timer = setTimeout(() => {
      setPending(true)
      analyzePosition(size, buildAnalysisMoves(state), komi, MAX_VISITS)
        .then((res) => {
          // Ignore responses superseded by a newer position.
          if (requestId !== requestRef.current) return
          if (!res.success || typeof res.blackWinRate !== 'number') {
            setError(res.error ?? '分析引擎未返回胜率')
            return
          }
          setError(null)
          setResult({
            blackWinRate: res.blackWinRate,
            blackLead: res.blackLead ?? 0,
            visits: res.visits ?? 0,
            bestMoves: res.moves ?? [],
            signature,
          })
        })
        .catch((e: unknown) => {
          if (requestId !== requestRef.current) return
          setError(e instanceof Error ? e.message : String(e))
        })
        .finally(() => {
          if (requestId === requestRef.current) setPending(false)
        })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
    // `state` is intentionally excluded: it changes identity every render while
    // the query only depends on the position and settings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, moveCount, size, komi, signature])

  // Derive rather than reset: a result for a different position is simply not used.
  const fresh = active && result?.signature === signature ? result : null
  return { analysis: fresh, error: active ? error : null, pending: active && pending }
}

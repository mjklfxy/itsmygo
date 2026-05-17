import { useEffect, useRef } from 'react'
import type { GameState } from '../game/types'
import type { GameAction } from '../game/reducer'
import { selectMove } from '../game/ai/heuristicAi'
import { requestKatagoMove } from '../services/katagoApi'
import { moveToGtp, gtpToMove } from '../game/gtpCoords'

function isKatagoMode(mode: string): boolean {
  return mode === 'katago-black' || mode === 'katago-white'
}

/** Convert game move history to GTP format for KataGo */
function buildGtpMoves(state: GameState): [string, string][] {
  return state.moves
    .filter(m => !m.pass)
    .map(m => [
      m.player === 1 ? 'B' : 'W',
      moveToGtp(m.x, m.y, state.size),
    ] as [string, string])
}

export function useGameAI(state: GameState, dispatch: React.Dispatch<GameAction>) {
  const aiThinking = useRef(false)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (state.mode !== 'play' || state.gameOver || state.aiMode === 'none') return
    const isAITurn =
      (state.aiMode === 'black' && state.currentPlayer === 1) ||
      (state.aiMode === 'white' && state.currentPlayer === -1) ||
      (state.aiMode === 'katago-black' && state.currentPlayer === 1) ||
      (state.aiMode === 'katago-white' && state.currentPlayer === -1)
    if (!isAITurn) { aiThinking.current = false; return }
    if (aiThinking.current) return

    aiThinking.current = true

    if (isKatagoMode(state.aiMode)) {
      // KataGo via backend API (async)
      const s = stateRef.current
      const color = s.currentPlayer === 1 ? 'B' : 'W'
      const gtpMoves = buildGtpMoves(s)

      requestKatagoMove(s.size, gtpMoves, color, s.komi)
        .then((result) => {
          if (result.success && result.move && result.move.toUpperCase() !== 'PASS') {
            const [x, y] = gtpToMove(result.move, s.size)
            dispatch({ type: 'PLACE_STONE', x, y })
          } else {
            dispatch({ type: 'PASS' })
          }
        })
        .catch((err) => {
          console.error('KataGo error:', err)
          // Fallback: pass on error
          dispatch({ type: 'PASS' })
        })
        .finally(() => {
          aiThinking.current = false
        })
    } else {
      // Heuristic AI (synchronous, with delay for UX)
      const timer = setTimeout(() => {
        const s = stateRef.current
        const prevBoard = s.history.length > 0 ? s.history[s.history.length - 1] : null
        const move = selectMove(s.board, s.currentPlayer, prevBoard)
        if (move) {
          dispatch({ type: 'PLACE_STONE', x: move.x, y: move.y })
        } else {
          dispatch({ type: 'PASS' })
        }
        aiThinking.current = false
      }, 300)
      return () => { clearTimeout(timer); aiThinking.current = false }
    }
  }, [state.history.length, state.currentPlayer, state.aiMode, state.mode, state.gameOver, dispatch])
}

import type { GameState } from './types'
import { score } from './logic'

export function formatGameResult(state: GameState, ongoingResult = '?'): string {
  if (!state.gameOver) return ongoingResult
  if (state.gameResult) return state.gameResult
  if (!state.winner) return 'Draw'

  const prefix = state.winner === 1 ? 'B' : 'W'
  if (state.gameEndReason === 'resign') return `${prefix}+Resign`

  const sc = score(state.board, state.captures, state.komi)
  const diff = state.winner === 1 ? sc.black - sc.white : sc.white - sc.black
  return `${prefix}+${Math.round(diff)}`
}

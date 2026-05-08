import { useEffect, useRef } from 'react'
import type { GameState } from '../game/types'
import type { GameAction } from '../game/reducer'
import { selectMove } from '../game/ai'

export function useGameAI(state: GameState, dispatch: React.Dispatch<GameAction>) {
  const aiThinking = useRef(false)

  useEffect(() => {
    if (state.mode !== 'play' || state.gameOver || state.aiMode === 'none') return
    const isAITurn =
      (state.aiMode === 'black' && state.currentPlayer === 1) ||
      (state.aiMode === 'white' && state.currentPlayer === -1)
    if (!isAITurn || aiThinking.current) return

    aiThinking.current = true
    const timer = setTimeout(() => {
      const prevBoard = state.history.length > 0 ? state.history[state.history.length - 1] : null
      const move = selectMove(state.board, state.currentPlayer, prevBoard)
      if (move) {
        dispatch({ type: 'PLACE_STONE', x: move.x, y: move.y })
      } else {
        dispatch({ type: 'PASS' })
      }
      aiThinking.current = false
    }, 300)
    return () => { clearTimeout(timer); aiThinking.current = false }
  }, [state.board, state.currentPlayer, state.aiMode, state.mode, state.gameOver, state.history, dispatch])
}

import { useEffect, useRef } from 'react'
import type { GameState } from '../game/types'
import type { GameAction } from '../game/reducer'
import { selectMove } from '../game/ai'

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
      (state.aiMode === 'white' && state.currentPlayer === -1)
    if (!isAITurn) { aiThinking.current = false; return }
    if (aiThinking.current) return

    aiThinking.current = true
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
  }, [state.history.length, state.currentPlayer, state.aiMode, state.mode, state.gameOver, dispatch])
}

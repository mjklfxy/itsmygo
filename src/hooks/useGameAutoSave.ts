import { useEffect, useRef } from 'react'
import type { GameState } from '../game/types'
import { score } from '../game/logic'
import { saveRecord } from '../game/sgf'

export function useGameAutoSave(state: GameState) {
  const savedRef = useRef(false)

  useEffect(() => {
    if (state.gameOver && !savedRef.current && state.moves.length > 0) {
      savedRef.current = true
      const isLastMovePass = state.moves[state.moves.length - 1].pass
      let result: string
      if (state.winner) {
        const sc = score(state.board, state.captures, state.komi)
        const diff = state.winner === 1 ? sc.black - sc.white : sc.white - sc.black
        const prefix = state.winner === 1 ? 'B' : 'W'
        result = isLastMovePass ? `${prefix}+${Math.round(diff)}` : `${prefix}+Resign`
      } else {
        result = 'Draw'
      }
      saveRecord({
        id: Date.now().toString(),
        size: state.size,
        date: new Date().toLocaleString('zh-CN'),
        moves: [...state.moves],
        result,
        komi: state.komi,
      })
    }
  }, [state.gameOver])
}

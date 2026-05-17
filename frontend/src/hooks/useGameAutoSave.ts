import { useEffect, useRef } from 'react'
import type { GameState } from '../game/types'
import { saveRecord } from '../services/gameRecords'
import { formatGameResult } from '../game/result'

export function useGameAutoSave(state: GameState) {
  const savedRef = useRef(false)

  useEffect(() => {
    if (state.gameOver && !savedRef.current && state.moves.length > 0) {
      savedRef.current = true
      const result = formatGameResult(state)
      saveRecord({
        id: Date.now().toString(),
        size: state.size,
        date: new Date().toLocaleString('zh-CN'),
        moves: [...state.moves],
        result,
        komi: state.komi,
      })
    }
  }, [state])
}

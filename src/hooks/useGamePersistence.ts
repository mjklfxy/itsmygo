import { useCallback } from 'react'
import type { GameState } from '../game/types'
import { score } from '../game/logic'
import { movesToSGF, downloadSGF, saveRecord } from '../game/sgf'

export function useGamePersistence(state: GameState) {
  const saveSGF = useCallback(() => {
    const result = state.gameOver
      ? (state.winner === 1 ? 'B+Resign' : state.winner === -1 ? 'W+Resign' : 'Draw')
      : '?'
    const sgf = movesToSGF(state.moves, state.size, result, state.komi)
    downloadSGF(sgf, `围棋${state.size}路_${new Date().toLocaleDateString('zh-CN')}.sgf`)
  }, [state])

  const saveCurrentRecord = useCallback(() => {
    const isLastMovePass = state.moves.length > 0 && state.moves[state.moves.length - 1].pass
    let result: string
    if (state.gameOver && state.winner) {
      const sc = score(state.board, state.captures, state.komi)
      const diff = state.winner === 1 ? sc.black - sc.white : sc.white - sc.black
      const prefix = state.winner === 1 ? 'B' : 'W'
      result = isLastMovePass ? `${prefix}+${Math.round(diff)}` : `${prefix}+Resign`
    } else if (state.gameOver) {
      result = 'Draw'
    } else {
      result = '进行中'
    }
    saveRecord({
      id: Date.now().toString(),
      size: state.size,
      date: new Date().toLocaleString('zh-CN'),
      moves: [...state.moves],
      result,
      komi: state.komi,
    })
    alert('对局已保存！')
  }, [state])

  return { saveSGF, saveRecord: saveCurrentRecord }
}

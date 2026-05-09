import { useCallback } from 'react'
import type { GameState } from '../game/types'
import { movesToSGF } from '../game/sgf'
import { formatGameResult } from '../game/result'
import { downloadSGF } from '../services/sgfDownload'
import { saveRecord } from '../services/gameRecords'

export function useGamePersistence(state: GameState) {
  const saveSGF = useCallback(() => {
    const result = formatGameResult(state)
    const sgf = movesToSGF(state.moves, state.size, result, state.komi)
    downloadSGF(sgf, `围棋${state.size}路_${new Date().toLocaleDateString('zh-CN')}.sgf`)
  }, [state])

  const saveCurrentRecord = useCallback(() => {
    const result = formatGameResult(state, '进行中')
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

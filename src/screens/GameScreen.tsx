import { useEffect } from 'react'
import type { GameRecord } from '../game/types'
import GoBoard from '../components/GoBoard'
import GamePanel from '../components/GamePanel'
import { useGameContext } from '../hooks/useGameContext'
import { useGameAI } from '../hooks/useGameAI'
import { useGameAutoSave } from '../hooks/useGameAutoSave'
import { score } from '../game/logic'
import styles from './GameScreen.module.css'

interface GameScreenProps {
  onBackToMenu: () => void
  pendingRecord?: GameRecord | null
  onRecordLoaded?: () => void
}

export default function GameScreen({ onBackToMenu, pendingRecord, onRecordLoaded }: GameScreenProps) {
  const { state, dispatch } = useGameContext()
  useGameAI(state, dispatch)
  useGameAutoSave(state)

  useEffect(() => {
    if (pendingRecord) {
      dispatch({ type: 'LOAD_RECORD', record: pendingRecord })
      onRecordLoaded?.()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const scores = state.gameOver ? score(state.board, state.captures, state.komi) : null

  return (
    <>
      <h1 className={styles.title}>围棋</h1>
      <div className={styles.gameArea}>
        <div className={styles.boardWrapper}>
          <GoBoard />
        </div>
        <GamePanel onBackToMenu={onBackToMenu} />
      </div>
      {scores && (
        <div className={styles.finalScore}>
          最终目数 — 黑: {scores.black} | 白: {scores.white} (含贴目 {state.komi})
        </div>
      )}
    </>
  )
}

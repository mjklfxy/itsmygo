import { useEffect } from 'react'
import type { GameRecord } from '../game/types'
import GoBoard from '../components/board/GoBoard'
import GamePanel from '../components/panel/GamePanel'
import { useGameContext } from '../hooks/useGameContext'
import { useGameAI } from '../hooks/useGameAI'
import { useGameAutoSave } from '../hooks/useGameAutoSave'
import styles from './GameScreen.module.css'

interface GameScreenProps {
  onBackToMenu: () => void
  pendingRecord?: GameRecord | null
  onRecordLoaded?: () => void
}

/** Reserves space for controls and lets the square board fit the remaining viewport; loads records without owning game rules. */
export default function GameScreen({
  onBackToMenu,
  pendingRecord,
  onRecordLoaded,
}: GameScreenProps) {
  const { state, dispatch } = useGameContext()
  useGameAI(state, dispatch)
  useGameAutoSave(state)

  useEffect(() => {
    if (pendingRecord) {
      dispatch({ type: 'LOAD_RECORD', record: pendingRecord })
      onRecordLoaded?.()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <header className={styles.header}>
        <div className={styles.brand}>
          itsmygo<span>．</span>
        </div>
        <span className={styles.headerMeta}>
          {state.size} 路 · 贴 {state.komi} 目 ·{' '}
          {state.aiMode === 'none'
            ? '双人对弈'
            : state.aiMode.startsWith('katago')
              ? 'KataGo'
              : '本地 AI'}
        </span>
        <button className={styles.back} onClick={onBackToMenu}>
          ← 返回棋室
        </button>
      </header>
      <div className={styles.gameArea}>
        <section className={styles.boardStage} aria-label="对局棋盘">
          <div className={styles.boardHeading}>
            <h1>
              {state.mode === 'review'
                ? '复盘'
                : state.mode === 'try'
                  ? '摆棋'
                  : '对局进行中'}
            </h1>
            <span>
              {state.moves.length} 手
              {state.gameOver ? ' · 已结束' : ''}
            </span>
          </div>
          <div className={styles.boardViewport}>
            <div className={styles.boardWrapper}>
              <GoBoard key={state.size} />
            </div>
          </div>
          <div className={styles.boardFoot}>
            <span>黑先 · 贴 {state.komi} 目</span>
            <span>橙点 = 最后一手</span>
          </div>
        </section>
        <GamePanel onBackToMenu={onBackToMenu} />
      </div>
    </>
  )
}

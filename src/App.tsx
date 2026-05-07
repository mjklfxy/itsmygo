import { useReducer, useCallback, useState, useEffect, useRef } from 'react'
import GoBoard from './components/GoBoard'
import GamePanel from './components/GamePanel'
import { gameReducer, createInitialState } from './game/reducer'
import { score } from './game/logic'
import { selectMove } from './game/ai'
import styles from './App.module.css'

type Screen = 'menu' | 'game'

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [config, setConfig] = useState({ size: 19, komi: 7.5, aiMode: 'none' as 'none' | 'black' | 'white', playerColor: 1 as 1 | -1 })
  const [showConfig, setShowConfig] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [state, dispatch] = useReducer(gameReducer, null, () => createInitialState(19))
  const aiThinking = useRef(false)

  const startGame = (cfg: { size: number; komi: number; aiMode: 'none' | 'black' | 'white'; playerColor: 1 | -1 }) => {
    // For AI mode, aiMode = the color the AI plays
    const aiMode = cfg.aiMode === 'none' ? 'none' as const
      : cfg.playerColor === 1 ? 'white' as const  // player=black, AI=white
      : 'black' as const                           // player=white, AI=black
    dispatch({ type: 'RESET', size: cfg.size, komi: cfg.komi, aiMode })
    setConfig({ ...cfg, aiMode })
    setScreen('game')
    setShowConfig(false)
  }

  const handlePlaceStone = useCallback((x: number, y: number) => {
    dispatch({ type: 'PLACE_STONE', x, y })
  }, [])

  const handleBackToMenu = useCallback(() => {
    setScreen('menu')
    setShowHistory(false)
  }, [])

  // AI turn logic
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
  }, [state.board, state.currentPlayer, state.aiMode, state.mode, state.gameOver, state.history])

  // ── Menu Screen ──
  if (screen === 'menu') {
    return (
      <div className={styles.container}>
        <div className={styles.menu}>
          <h1 className={styles.menuTitle}>围棋</h1>
          <p className={styles.menuSub}>Go · Weiqi</p>

          {!showConfig && !showHistory && (
            <div className={styles.menuButtons}>
              <button className={styles.menuBtn} onClick={() => { setConfig(c => ({ ...c, aiMode: 'none' })); setShowConfig(true) }}>
                <span className={styles.menuBtnIcon}>●</span>
                <span>新建对局</span>
              </button>
              <button className={styles.menuBtn} onClick={() => setShowHistory(true)}>
                <span className={styles.menuBtnIcon}>◇</span>
                <span>对局历史</span>
              </button>
              <button className={styles.menuBtn} onClick={() => { setConfig(c => ({ ...c, aiMode: 'white', playerColor: 1 })); setShowConfig(true) }}>
                <span className={styles.menuBtnIcon}>☆</span>
                <span>AI对战</span>
              </button>
            </div>
          )}

          {showConfig && (
            <div className={styles.config}>
              <div className={styles.configTitle}>
                {config.aiMode === 'none' ? '新建对局' : 'AI对战'}
              </div>

              {config.aiMode !== 'none' && (
                <div className={styles.configGroup}>
                  <span className={styles.configLabel}>执子</span>
                  <div className={styles.configOptions}>
                    <button
                      className={`${styles.configOpt} ${config.playerColor === 1 ? styles.configOptActive : ''}`}
                      onClick={() => setConfig(c => ({ ...c, playerColor: 1 as const }))}>
                      <span style={{ background: 'radial-gradient(circle at 35% 35%, #666, #222)', display: 'inline-block', width: 14, height: 14, borderRadius: '50%', verticalAlign: 'middle', marginRight: 4 }} />
                      黑棋
                    </button>
                    <button
                      className={`${styles.configOpt} ${config.playerColor === -1 ? styles.configOptActive : ''}`}
                      onClick={() => setConfig(c => ({ ...c, playerColor: -1 as const }))}>
                      <span style={{ background: 'radial-gradient(circle at 35% 35%, #fff, #f0e8ee)', border: '1px solid #d8ccd0', display: 'inline-block', width: 14, height: 14, borderRadius: '50%', verticalAlign: 'middle', marginRight: 4 }} />
                      白棋
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.configGroup}>
                <span className={styles.configLabel}>棋盘</span>
                <div className={styles.configOptions}>
                  {[9, 13, 19].map(s => (
                    <button key={s}
                      className={`${styles.configOpt} ${config.size === s ? styles.configOptActive : ''}`}
                      onClick={() => setConfig(c => ({ ...c, size: s }))}>{s}路</button>
                  ))}
                </div>
              </div>

              <div className={styles.configGroup}>
                <span className={styles.configLabel}>贴目</span>
                <div className={styles.configOptions}>
                  {[5.5, 6.5, 7.5].map(k => (
                    <button key={k}
                      className={`${styles.configOpt} ${config.komi === k ? styles.configOptActive : ''}`}
                      onClick={() => setConfig(c => ({ ...c, komi: k }))}>{k}</button>
                  ))}
                </div>
              </div>

              <div className={styles.configButtons}>
                <button className={styles.configStart} onClick={() => startGame(config)}>开始</button>
                <button className={styles.configCancel} onClick={() => setShowConfig(false)}>返回</button>
              </div>
            </div>
          )}

          {showHistory && (
            <div className={styles.historyPanel}>
              <div className={styles.configTitle}>对局历史</div>
              <div className={styles.historyList}>
                {(() => {
                  const records = JSON.parse(localStorage.getItem('go_records') || '[]')
                  if (records.length === 0) return <div className={styles.historyEmpty}>暂无记录</div>
                  return records.map((rec: any) => (
                    <div key={rec.id} className={styles.historyItem}>
                      <div className={styles.historyInfo}>
                        <span>{rec.size}路 · {rec.date}</span>
                        <span className={styles.historyResult}>{rec.result}</span>
                      </div>
                      <div className={styles.historyInfo}>
                        <span>{rec.moves.length} 手</span>
                        <button className={styles.historyDel} onClick={() => {
                          const r = JSON.parse(localStorage.getItem('go_records') || '[]').filter((x: any) => x.id !== rec.id)
                          localStorage.setItem('go_records', JSON.stringify(r))
                          setShowHistory(false); setTimeout(() => setShowHistory(true), 0)
                        }}>删除</button>
                      </div>
                    </div>
                  ))
                })()}
              </div>
              <button className={styles.configCancel} onClick={() => setShowHistory(false)}>返回</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Game Screen ──
  const scores = state.gameOver ? score(state.board, state.captures, state.komi) : null

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>围棋</h1>

      <div className={styles.gameArea}>
        <div className={styles.boardWrapper}>
          <GoBoard
            board={state.board}
            currentPlayer={state.currentPlayer}
            lastMove={state.lastMove}
            onPlaceStone={handlePlaceStone}
            disabled={state.mode === 'review' || state.countingMode !== 'none'}
            countingTerritory={state.countingMode === 'requested' ? state.countingTerritory : null}
            deadStones={state.countingMode === 'requested' ? state.countingDeadStones : undefined}
          />
        </div>

        <GamePanel
          state={state}
          onPass={() => dispatch({ type: 'PASS' })}
          onUndo={() => dispatch({ type: 'UNDO' })}
          onResign={() => dispatch({ type: 'RESIGN' })}
          onReset={(size) => dispatch({ type: 'RESET', size, komi: state.komi, aiMode: state.aiMode })}
          onEnterReview={() => dispatch({ type: 'ENTER_REVIEW' })}
          onExitReview={() => dispatch({ type: 'EXIT_REVIEW' })}
          onReviewPrev={() => dispatch({ type: 'REVIEW_PREV' })}
          onReviewNext={() => dispatch({ type: 'REVIEW_NEXT' })}
          onEnterTry={() => dispatch({ type: 'ENTER_TRY' })}
          onExitTry={() => dispatch({ type: 'EXIT_TRY' })}
          onRequestCount={() => dispatch({ type: 'REQUEST_COUNT' })}
          onAcceptCount={() => dispatch({ type: 'ACCEPT_COUNT' })}
          onRejectCount={() => dispatch({ type: 'REJECT_COUNT' })}
          onCancelCount={() => dispatch({ type: 'CANCEL_COUNT' })}
          onBackToMenu={handleBackToMenu}
        />
      </div>

      {scores && (
        <div className={styles.finalScore}>
          最终目数 — 黑: {scores.black} | 白: {scores.white} (含贴目 {state.komi})
        </div>
      )}
    </div>
  )
}

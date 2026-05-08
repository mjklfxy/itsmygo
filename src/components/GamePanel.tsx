import { useMemo, useState } from 'react'
import { score } from '../game/logic'
import { evaluate } from '../game/evaluate'
import { loadRecords, deleteRecord } from '../game/sgf'
import { useGameContext } from '../context/GameContext'
import { useGamePersistence } from '../hooks/useGamePersistence'
import styles from './GamePanel.module.css'

interface GamePanelProps {
  onBackToMenu: () => void
}

export default function GamePanel({ onBackToMenu }: GamePanelProps) {
  const { state, dispatch } = useGameContext()
  const { saveSGF, saveRecord } = useGamePersistence(state)
  const [showHistory, setShowHistory] = useState(false)

  const scores = state.gameOver ? score(state.board, state.captures, state.komi) : null
  const evalResult = useMemo(
    () => (!state.gameOver && (state.mode === 'play' || state.mode === 'review') && state.history.length > 0
      ? evaluate(state.board, state.captures, state.komi) : null),
    [state.board, state.captures, state.gameOver, state.mode, state.history.length, state.komi]
  )

  const savedRecords = useMemo(() => showHistory ? loadRecords() : [], [showHistory])

  const isPlaying = state.mode === 'play' && !state.gameOver
  const isReview = state.mode === 'review'
  const isTry = state.mode === 'try'

  return (
    <div className={styles.panel}>
      {/* Mode indicator */}
      {isReview && (
        <div className={styles.modeTag}>
          复盘模式 · 第 {state.reviewIndex + 1} / {state.history.length} 手
          <button className={styles.modeExit} onClick={() => dispatch({ type: 'EXIT_REVIEW' })}>退出</button>
        </div>
      )}
      {isTry && (
        <div className={styles.modeTag}>
          摆棋中 · 可自由落子
          <button className={styles.modeExit} onClick={() => dispatch({ type: 'EXIT_TRY' })}>还原</button>
        </div>
      )}
      {state.countingMode === 'requested' && (
        <div className={styles.modeTag} style={{ background: 'linear-gradient(135deg, #88a888, #709870)' }}>
          数子中 · 请确认数目结果
          <button className={styles.modeExit} onClick={() => dispatch({ type: 'CANCEL_COUNT' })}>取消</button>
        </div>
      )}

      {/* Turn / Winner */}
      {!state.gameOver && !isReview && (
        <div className={styles.turn}>
          <div className={`${styles.turnIndicator} ${state.currentPlayer === 1 ? styles.turnBlack : styles.turnWhite}`} />
          <span className={styles.turnText}>
            {isTry ? '摆棋中' : state.currentPlayer === 1 ? '黑方落子' : '白方落子'}
          </span>
        </div>
      )}
      {state.gameOver && (
        <div className={styles.winner}>
          {state.winner === 1 ? '黑方胜！' : state.winner === -1 ? '白方胜！' : '平局！'}
        </div>
      )}

      {/* Evaluation */}
      {evalResult && (
        <div className={styles.evaluation}>
          <div className={styles.evalTitle}>形势判断</div>
          <div className={styles.winRate}>
            <div className={styles.winRateLabel}>AI胜率</div>
            <div className={styles.winRateBar}>
              <div className={styles.winRateBlack}
                style={{ width: `${evalResult.winRate * 100}%` }} />
            </div>
            <div className={styles.winRateValues}>
              <span className={styles.evalBlack}>{Math.round(evalResult.winRate * 100)}%</span>
              <span className={styles.evalWhite}>{Math.round((1 - evalResult.winRate) * 100)}%</span>
            </div>
          </div>
          <div className={styles.evalScores}>
            <span className={styles.evalBlack}>黑 {evalResult.black}</span>
            <span className={styles.evalDiff}>
              {evalResult.black > evalResult.white ? `黑+${evalResult.black - evalResult.white}`
                : evalResult.white > evalResult.black ? `白+${evalResult.white - evalResult.black}` : '均势'}
            </span>
            <span className={styles.evalWhite}>白 {evalResult.white}</span>
          </div>
          <div className={styles.evalBreakdown}>
            <div className={styles.evalRow}>
              <span className={styles.evalLabel}>实地</span>
              <span className={styles.evalBlack}>{evalResult.blackTerritory}</span>
              <span className={styles.evalSep}>|</span>
              <span className={styles.evalWhite}>{evalResult.whiteTerritory}</span>
            </div>
            <div className={styles.evalRow}>
              <span className={styles.evalLabel}>势力</span>
              <span className={styles.evalBlack}>{evalResult.blackInfluence}</span>
              <span className={styles.evalSep}>|</span>
              <span className={styles.evalWhite}>{evalResult.whiteInfluence}</span>
            </div>
          </div>
        </div>
      )}

      {/* Captures */}
      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}><span className={`${styles.miniStone} ${styles.miniBlack}`} />黑提子</span>
          <span className={styles.statValue}>{state.captures.black}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}><span className={`${styles.miniStone} ${styles.miniWhite}`} />白提子</span>
          <span className={styles.statValue}>{state.captures.white}</span>
        </div>
      </div>

      {/* Scores */}
      {scores && (
        <div className={styles.scores}>
          <div className={styles.scoreItem}><span>黑方</span><span className={styles.scoreValue}>{scores.black} 目</span></div>
          <div className={styles.scoreItem}><span>白方</span><span className={styles.scoreValue}>{scores.white} 目</span></div>
          <div className={styles.komiNote}>含贴目 {state.komi}</div>
        </div>
      )}

      {/* Komi display during play */}
      {!state.gameOver && !scores && (
        <div className={styles.komiNote}>贴目 {state.komi} · {state.aiMode === 'none' ? '双人对战' : `AI对战 · 你执${state.aiMode === 'white' ? '黑' : '白'}`}</div>
      )}

      {/* Review nav */}
      {isReview && !isTry && (
        <>
          <div className={styles.buttons}>
            <button className={`${styles.btn} ${styles.btnNav}`} onClick={() => dispatch({ type: 'REVIEW_PREV' })}
              disabled={state.reviewIndex <= 0}>&lt; 上一步</button>
            <button className={`${styles.btn} ${styles.btnNav}`} onClick={() => dispatch({ type: 'REVIEW_NEXT' })}
              disabled={state.reviewIndex >= state.history.length - 1}>下一步 &gt;</button>
          </div>
          <div className={styles.buttons}>
            <button className={`${styles.btn} ${styles.btnTry}`} onClick={() => dispatch({ type: 'ENTER_TRY' })}>摆棋试下</button>
          </div>
        </>
      )}

      {/* Game controls */}
      {!isReview && !isTry && state.countingMode === 'none' && (
        <>
          <div className={styles.buttons}>
            <button className={`${styles.btn} ${styles.btnPass}`} onClick={() => dispatch({ type: 'PASS' })} disabled={!isPlaying}>Pass</button>
            <button className={`${styles.btn} ${styles.btnUndo}`} onClick={() => dispatch({ type: 'UNDO' })}
              disabled={state.history.length === 0 || state.gameOver}>悔棋</button>
          </div>
          <div className={styles.buttons}>
            <button className={`${styles.btn} ${styles.btnResign}`} onClick={() => dispatch({ type: 'RESIGN' })} disabled={!isPlaying}>认输</button>
            <button className={`${styles.btn} ${styles.btnCount}`} onClick={() => dispatch({ type: 'REQUEST_COUNT' })}
              disabled={!isPlaying}>数子</button>
          </div>
        </>
      )}

      {/* Counting mode: accept / reject */}
      {state.countingMode === 'requested' && (
        <>
          <div className={styles.countResult}>
            {state.countingDeadStones.length > 0 && (
              <div className={styles.countDeadStones}>
                <div className={styles.countDeadTitle}>判定死子</div>
                <div className={styles.countDeadList}>
                  {state.countingDeadStones.map((s, i) => (
                    <span key={i} className={`${styles.miniStone} ${s.color === 1 ? styles.miniBlack : styles.miniWhite}`}
                      style={{ opacity: 0.5, textDecoration: 'line-through', marginRight: 4 }} />
                  ))}
                  <span className={styles.countDeadNote}>
                    {state.countingDeadStones.filter(s => s.color === 1).length > 0 && `黑 ${state.countingDeadStones.filter(s => s.color === 1).length} 枚`}
                    {state.countingDeadStones.filter(s => s.color === 1).length > 0 && state.countingDeadStones.filter(s => s.color === -1).length > 0 && ' · '}
                    {state.countingDeadStones.filter(s => s.color === -1).length > 0 && `白 ${state.countingDeadStones.filter(s => s.color === -1).length} 枚`}
                  </span>
                </div>
              </div>
            )}
            <div className={styles.countRow}>
              <span className={styles.countLabel}><span className={`${styles.miniStone} ${styles.miniBlack}`} />黑</span>
              <span className={styles.countValue}>{state.countingBlackScore} 目</span>
            </div>
            <div className={styles.countRow}>
              <span className={styles.countLabel}><span className={`${styles.miniStone} ${styles.miniWhite}`} />白</span>
              <span className={styles.countValue}>{state.countingWhiteScore} 目 (含贴目 {state.komi})</span>
            </div>
            <div className={styles.countDiff}>
              {state.countingBlackScore > state.countingWhiteScore
                ? `黑胜 ${state.countingBlackScore - state.countingWhiteScore} 目`
                : state.countingWhiteScore > state.countingBlackScore
                  ? `白胜 ${state.countingWhiteScore - state.countingBlackScore} 目`
                  : '平局'}
            </div>
          </div>
          <div className={styles.buttons}>
            <button className={`${styles.btn} ${styles.btnAccept}`} onClick={() => dispatch({ type: 'ACCEPT_COUNT' })}>接受</button>
            <button className={`${styles.btn} ${styles.btnReject}`} onClick={() => dispatch({ type: 'REJECT_COUNT' })}>拒绝</button>
          </div>
        </>
      )}

      {/* Try mode controls */}
      {isTry && (
        <div className={styles.buttons}>
          <button className={`${styles.btn} ${styles.btnUndo}`} onClick={() => dispatch({ type: 'UNDO' })}
            disabled={state.history.length === 0}>撤销</button>
        </div>
      )}

      {/* Post-game actions */}
      {state.gameOver && !isReview && (
        <div className={styles.buttons}>
          <button className={`${styles.btn} ${styles.btnReview}`} onClick={() => dispatch({ type: 'ENTER_REVIEW' })}>复盘</button>
        </div>
      )}

      {/* Save */}
      {state.moves.length > 0 && (
        <div className={styles.buttons}>
          <button className={`${styles.btn} ${styles.btnSave}`} onClick={saveSGF}>保存 SGF</button>
          <button className={`${styles.btn} ${styles.btnSave}`} onClick={saveRecord}>保存对局</button>
        </div>
      )}

      {/* Move count */}
      <div className={styles.moveCount}>手数: {state.moves.length} · {state.size}路 · 贴目{state.komi}</div>

      {/* Back to menu */}
      <button className={styles.historyToggle} onClick={onBackToMenu}>
        返回主菜单
      </button>

      {/* History toggle */}
      <button className={styles.historyToggle} onClick={() => setShowHistory(!showHistory)}>
        {showHistory ? '收起历史' : '对战历史'} ({loadRecords().length})
      </button>

      {showHistory && (
        <div className={styles.historyList}>
          {savedRecords.length === 0 && <div className={styles.historyEmpty}>暂无记录</div>}
          {savedRecords.map(rec => (
            <div key={rec.id} className={styles.historyItem}>
              <div className={styles.historyInfo}>
                <span>{rec.size}路 · {rec.date}</span>
                <span className={styles.historyResult}>{rec.result}</span>
              </div>
              <div className={styles.historyInfo}>
                <span>{rec.moves.length} 手</span>
                <button className={styles.historyDel} onClick={() => { deleteRecord(rec.id); setShowHistory(true) }}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

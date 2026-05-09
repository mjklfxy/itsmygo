import { useMemo, useState } from 'react'
import { score } from '../../game/logic'
import { evaluate } from '../../game/evaluate'
import { useGameContext } from '../../hooks/useGameContext'
import { useGamePersistence } from '../../hooks/useGamePersistence'
import styles from './GamePanel.module.css'

interface GamePanelProps {
  onBackToMenu: () => void
}

export default function GamePanel({ onBackToMenu }: GamePanelProps) {
  const { state, dispatch } = useGameContext()
  const { saveSGF } = useGamePersistence(state)
  const [showSettings, setShowSettings] = useState(false)

  const scores = state.gameOver ? score(state.board, state.captures, state.komi) : null
  const evalResult = useMemo(
    () => (!state.gameOver && (state.mode === 'play' || state.mode === 'review') && state.history.length > 0
      ? evaluate(state.board, state.captures, state.komi) : null),
    [state.board, state.captures, state.gameOver, state.mode, state.history.length, state.komi]
  )

  const isPlaying = state.mode === 'play' && !state.gameOver
  const isReview = state.mode === 'review'
  const isTry = state.mode === 'try'
  const blackLead = evalResult ? evalResult.black - evalResult.white : null
  const canTry = !isTry && state.moves.length > 0 && !state.gameOver

  return (
    <div className={styles.panel}>
      <div className={styles.mobileHeader}>
        <div className={styles.mobileTools}>
          <button className={styles.mobileToolButton} type="button" aria-label="主页占位" disabled>⌂</button>
          <button className={styles.mobileToolButton} type="button" aria-label="用户占位" disabled>♙</button>
          <button className={styles.mobileToolButton} type="button" onClick={() => setShowSettings(true)} aria-label="设置">⚙</button>
        </div>
        <div className={styles.mobileBrand}>
          <div className={styles.mobileTitle}>围棋</div>
          <div className={styles.mobileMeta}>{state.size}路 · {state.aiMode === 'none' ? '双人对战' : '本地 AI'}</div>
        </div>
      </div>

      {/* Mode indicator */}
      {isReview && (
        <div className={styles.modeTag}>
          复盘模式 · 第 {state.reviewIndex} / {state.moves.length} 手
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
          <div className={styles.turnMain}>
            <div className={`${styles.turnIndicator} ${state.currentPlayer === 1 ? styles.turnBlack : styles.turnWhite}`} />
            <span className={styles.turnText}>
              {isTry ? '摆棋中' : state.currentPlayer === 1 ? '黑方落子' : '白方落子'}
            </span>
          </div>
          <div className={styles.turnMetaGroup}>
            <span className={styles.gameMeta}>{state.moves.length}手 · {state.size}路 · 贴{state.komi}</span>
            <button className={styles.moreIconButton} type="button" onClick={() => setShowSettings(true)} aria-label="设置">
              ⚙
            </button>
          </div>
        </div>
      )}
      {state.gameOver && (
        <div className={styles.winner}>
          {state.winner === 1 ? '黑方胜！' : state.winner === -1 ? '白方胜！' : '平局！'}
        </div>
      )}

      <div className={styles.playerCards}>
        <div className={`${styles.playerCard} ${state.currentPlayer === 1 && !state.gameOver ? styles.activePlayerCard : ''}`}>
          <span className={`${styles.playerStone} ${styles.turnBlack}`} />
          <span className={styles.playerName}>黑子</span>
          <span className={styles.playerCaptures}>提子: {state.captures.black}</span>
        </div>
        <div className={`${styles.playerCard} ${state.currentPlayer === -1 && !state.gameOver ? styles.activePlayerCard : ''}`}>
          <span className={styles.playerName}>白子</span>
          <span className={styles.playerCaptures}>提子: {state.captures.white}</span>
          <span className={`${styles.playerStone} ${styles.turnWhite}`} />
        </div>
      </div>

      {/* Evaluation */}
      {evalResult && (
        <div className={styles.evaluation}>
          <div className={styles.evalLead}>
            {blackLead === null ? '形势判断' : blackLead > 0 ? `黑领先 ${blackLead}目` : blackLead < 0 ? `白领先 ${Math.abs(blackLead)}目` : '形势均衡'}
          </div>
          <div className={styles.winRateRow}>
            <span className={`${styles.evalPercent} ${styles.evalBlack}`}>黑胜率 {Math.round(evalResult.winRate * 100)}%</span>
            <div className={styles.winRateBar}>
              <div className={styles.winRateBlack}
                style={{ width: `${evalResult.winRate * 100}%` }} />
            </div>
            <span className={`${styles.evalPercent} ${styles.evalWhite}`}>白 {Math.round((1 - evalResult.winRate) * 100)}%</span>
          </div>
        </div>
      )}

      {/* Scores */}
      {scores && (
        <div className={styles.scores}>
          <div className={styles.scoreItem}><span>黑方</span><span className={styles.scoreValue}>{scores.black} 目</span></div>
          <div className={styles.scoreItem}><span>白方</span><span className={styles.scoreValue}>{scores.white} 目</span></div>
          <div className={styles.komiNote}>含贴目 {state.komi}</div>
        </div>
      )}

      {/* Review nav */}
      {isReview && !isTry && (
        <>
          <div className={styles.buttons}>
            <button className={`${styles.btn} ${styles.btnNav}`} onClick={() => dispatch({ type: 'REVIEW_PREV' })}
              disabled={state.reviewIndex <= 0}>&lt; 上一步</button>
            <button className={`${styles.btn} ${styles.btnNav}`} onClick={() => dispatch({ type: 'REVIEW_NEXT' })}
              disabled={state.reviewIndex >= state.moves.length}>下一步 &gt;</button>
          </div>
        </>
      )}

      {/* Game controls */}
      {!isReview && !isTry && state.countingMode === 'none' && (
        <>
          <div className={`${styles.buttons} ${styles.primaryControls}`}>
            <button className={`${styles.btn} ${styles.btnPass}`} onClick={() => dispatch({ type: 'PASS' })} disabled={!isPlaying}>Pass</button>
            <button className={`${styles.btn} ${styles.btnUndo}`} onClick={() => dispatch({ type: 'UNDO' })}
              disabled={state.history.length === 0 || state.gameOver}>悔棋</button>
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
        <div className={`${styles.buttons} ${styles.primaryControls}`}>
          <button className={`${styles.btn} ${styles.btnReview}`} onClick={() => dispatch({ type: 'ENTER_REVIEW' })}>复盘</button>
        </div>
      )}

      {showSettings && (
        <div className={styles.modalLayer} role="dialog" aria-modal="true" aria-label="设置">
          <div className={styles.settingsModal}>
            <div className={styles.settingsHeader}>
              <span>设置</span>
              <button className={styles.modalClose} type="button" onClick={() => setShowSettings(false)} aria-label="关闭设置">×</button>
            </div>
            <div className={styles.settingsGrid}>
              <button className={styles.settingsButton} type="button" onClick={onBackToMenu}>返回主菜单</button>
              <button className={styles.settingsButton} type="button" onClick={saveSGF} disabled={state.moves.length === 0}>保存 SGF</button>
              <button
                className={styles.settingsButton}
                type="button"
                onClick={() => {
                  dispatch({ type: 'ENTER_TRY' })
                  setShowSettings(false)
                }}
                disabled={!canTry}
              >
                摆棋试下
              </button>
              <button className={styles.settingsButton} type="button" disabled>对战历史</button>
              <button className={styles.settingsButton} type="button" disabled>棋盘设置</button>
              <button className={styles.settingsButton} type="button" disabled>音效设置</button>
              <button className={styles.settingsButton} type="button" disabled>主题设置</button>
              <button className={styles.settingsButton} type="button" disabled>规则说明</button>
            </div>
            <div className={styles.settingsHint}>占位项只展示入口，后续再接具体配置。</div>
          </div>
        </div>
      )}
    </div>
  )
}

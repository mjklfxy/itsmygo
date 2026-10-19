import { useEffect, useMemo, useRef, useState } from 'react'
import { score } from '../../game/logic'
import { evaluate } from '../../game/evaluate'
import { useGameContext } from '../../hooks/useGameContext'
import { useGamePersistence } from '../../hooks/useGamePersistence'
import { useKataGoAnalysis } from '../../hooks/useKataGoAnalysis'
import styles from './GamePanel.module.css'

interface GamePanelProps {
  onBackToMenu: () => void
}

/** Shows only controls relevant to the current phase so the board retains space; settings use a focus-trapping native dialog. */
export default function GamePanel({ onBackToMenu }: GamePanelProps) {
  const { state, dispatch } = useGameContext()
  const { saveSGF } = useGamePersistence(state)
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (showSettings) settingsRef.current?.showModal()
    else settingsRef.current?.close()
  }, [showSettings])

  const scores = state.gameOver
    ? score(state.board, state.captures, state.komi)
    : null
  const evalResult = useMemo(
    () =>
      !state.gameOver &&
      (state.mode === 'play' || state.mode === 'review') &&
      state.history.length > 0
        ? evaluate(state.board, state.captures, state.komi)
        : null,
    [
      state.board,
      state.captures,
      state.gameOver,
      state.mode,
      state.history.length,
      state.komi,
    ],
  )

  // Real engine evaluation, available only in KataGo modes. Falls back to the
  // local heuristic when the analysis engine is not reachable.
  const kata = useKataGoAnalysis(state, state.moves.length > 0)
  const engineAnalysis = kata.analysis
  const useEngine = engineAnalysis !== null

  const isPlaying = state.mode === 'play' && !state.gameOver
  const isReview = state.mode === 'review'
  const isTry = state.mode === 'try'
  const blackLead = useEngine
    ? engineAnalysis.blackLead
    : evalResult
      ? evalResult.black - evalResult.white
      : null
  const blackWinRate = useEngine
    ? engineAnalysis.blackWinRate
    : evalResult
      ? evalResult.winRate
      : null
  const canTry = !isTry && state.moves.length > 0 && !state.gameOver

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeading}>
        <div>
          <h2>对局信息</h2>
        </div>
        <button
          className={styles.moreIconButton}
          type="button"
          onClick={() => setShowSettings(true)}
          aria-label="对局设置"
        >
          设置
        </button>
      </div>

      {/* Mode indicator */}
      {isReview && (
        <div className={styles.modeTag}>
          复盘模式 · 第 {state.reviewIndex} / {state.moves.length} 手
          <button
            className={styles.modeExit}
            onClick={() => dispatch({ type: 'EXIT_REVIEW' })}
          >
            退出
          </button>
        </div>
      )}
      {isTry && (
        <div className={styles.modeTag}>
          摆棋中 · 可自由落子
          <button
            className={styles.modeExit}
            onClick={() => dispatch({ type: 'EXIT_TRY' })}
          >
            还原
          </button>
        </div>
      )}
      {state.countingMode === 'requested' && (
        <div className={styles.modeTag}>
          数子中 · 请确认数目结果
          <button
            className={styles.modeExit}
            onClick={() => dispatch({ type: 'CANCEL_COUNT' })}
          >
            取消
          </button>
        </div>
      )}

      {/* Turn / Winner */}
      {isPlaying && state.countingMode === 'none' && (
        <div className={styles.turn} role="status" aria-live="polite">
          <div className={styles.turnMain}>
            <div
              className={`${styles.turnIndicator} ${state.currentPlayer === 1 ? styles.turnBlack : styles.turnWhite}`}
            />
            <span className={styles.turnText}>
              {isTry
                ? '摆棋中'
                : state.aiMode !== 'none' &&
                    state.aiMode.endsWith(
                      state.currentPlayer === 1 ? 'black' : 'white',
                    )
                  ? '等待 AI 落子'
                  : state.currentPlayer === 1
                    ? '轮到黑方'
                    : '轮到白方'}
            </span>
          </div>
          <div className={styles.turnMetaGroup}>
            <span className={styles.gameMeta}>
              {state.moves.length}手 · {state.size}路 · 贴{state.komi}
            </span>
          </div>
        </div>
      )}
      {state.gameOver && !isReview && (
        <div className={styles.winner}>
          {state.winner === 1
            ? '黑方胜！'
            : state.winner === -1
              ? '白方胜！'
              : '平局！'}
        </div>
      )}

      {!state.gameOver && state.countingMode === 'none' && (
        <div className={styles.playerCards}>
          <div
            className={`${styles.playerCard} ${state.currentPlayer === 1 && !state.gameOver ? styles.activePlayerCard : ''}`}
          >
            <span className={`${styles.playerStone} ${styles.turnBlack}`} />
            <span className={styles.playerName}>黑子</span>
            <span className={styles.playerCaptures}>
              提子: {state.captures.black}
            </span>
          </div>
          <div
            className={`${styles.playerCard} ${state.currentPlayer === -1 && !state.gameOver ? styles.activePlayerCard : ''}`}
          >
            <span className={styles.playerName}>白子</span>
            <span className={styles.playerCaptures}>
              提子: {state.captures.white}
            </span>
            <span className={`${styles.playerStone} ${styles.turnWhite}`} />
          </div>
        </div>
      )}

      {/* Evaluation */}
      {evalResult && state.countingMode === 'none' && (
        <div className={styles.evaluation}>
          <div className={styles.evalTitle}>
            {useEngine ? (
              <>
                KataGo 分析
                <span className={styles.evalVisits}>
                  {engineAnalysis.visits} 次搜索
                </span>
              </>
            ) : kata.error ? (
              <>
                引擎不可用
                <span className={styles.evalVisits}>显示本地估算</span>
              </>
            ) : (
              '形势估算 · 本地启发式'
            )}
          </div>
          <div className={styles.evalLead}>
            {blackLead === null
              ? '形势判断'
              : blackLead > 0
                ? `黑领先 ${blackLead.toFixed(useEngine ? 1 : 0)}目`
                : blackLead < 0
                  ? `白领先 ${Math.abs(blackLead).toFixed(useEngine ? 1 : 0)}目`
                  : '形势均衡'}
          </div>
          <div className={styles.winRateRow}>
            <span className={`${styles.evalPercent} ${styles.evalBlack}`}>
              黑胜率 {Math.round((blackWinRate ?? 0) * 100)}%
            </span>
            <div className={styles.winRateBar}>
              <div
                className={styles.winRateBlack}
                style={{ width: `${(blackWinRate ?? 0) * 100}%` }}
              />
            </div>
            <span className={`${styles.evalPercent} ${styles.evalWhite}`}>
              白 {Math.round((1 - (blackWinRate ?? 0)) * 100)}%
            </span>
          </div>
          {kata.error && (
            <p className={styles.evalError} role="status">
              {kata.error}
            </p>
          )}
        </div>
      )}

      {/* Scores */}
      {scores && (
        <div className={styles.scores}>
          <div className={styles.scoreItem}>
            <span>黑方</span>
            <span className={styles.scoreValue}>{scores.black} 目</span>
          </div>
          <div className={styles.scoreItem}>
            <span>白方</span>
            <span className={styles.scoreValue}>{scores.white} 目</span>
          </div>
          <div className={styles.komiNote}>含贴目 {state.komi}</div>
        </div>
      )}

      {/* Review nav */}
      {isReview && !isTry && (
        <>
          <div className={styles.buttons}>
            <button
              className={`${styles.btn} ${styles.btnNav}`}
              onClick={() => dispatch({ type: 'REVIEW_PREV' })}
              disabled={state.reviewIndex <= 0}
            >
              &lt; 上一步
            </button>
            <button
              className={`${styles.btn} ${styles.btnNav}`}
              onClick={() => dispatch({ type: 'REVIEW_NEXT' })}
              disabled={state.reviewIndex >= state.moves.length}
            >
              下一步 &gt;
            </button>
            <button
              className={`${styles.btn} ${styles.btnTry}`}
              onClick={() => dispatch({ type: 'ENTER_TRY' })}
            >
              摆棋
            </button>
          </div>
        </>
      )}

      {/* Game controls */}
      {isPlaying && state.countingMode === 'none' && (
        <>
          <div className={`${styles.buttons} ${styles.primaryControls}`}>
            <button
              className={`${styles.btn} ${styles.btnPass}`}
              onClick={() => dispatch({ type: 'PASS' })}
              disabled={!isPlaying}
            >
              停一手
            </button>
            <button
              className={`${styles.btn} ${styles.btnUndo}`}
              onClick={() => dispatch({ type: 'UNDO' })}
              disabled={state.history.length === 0 || state.gameOver}
            >
              悔棋
            </button>
            <button
              className={`${styles.btn} ${styles.btnResign}`}
              onClick={() => dispatch({ type: 'RESIGN' })}
              disabled={!isPlaying}
            >
              认输
            </button>
            <button
              className={`${styles.btn} ${styles.btnCount}`}
              onClick={() => dispatch({ type: 'REQUEST_COUNT' })}
              disabled={!isPlaying || state.moves.length < 2}
            >
              数子
            </button>
            <button
              className={`${styles.btn} ${styles.btnTry}`}
              onClick={() => dispatch({ type: 'ENTER_TRY' })}
              disabled={!canTry}
            >
              摆棋
            </button>
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
                  <span className={styles.countDeadNote}>
                    {state.countingDeadStones.filter((s) => s.color === 1)
                      .length > 0 &&
                      `黑 ${state.countingDeadStones.filter((s) => s.color === 1).length} 枚`}
                    {state.countingDeadStones.filter((s) => s.color === 1)
                      .length > 0 &&
                      state.countingDeadStones.filter((s) => s.color === -1)
                        .length > 0 &&
                      ' · '}
                    {state.countingDeadStones.filter((s) => s.color === -1)
                      .length > 0 &&
                      `白 ${state.countingDeadStones.filter((s) => s.color === -1).length} 枚`}
                  </span>
                </div>
              </div>
            )}
            <div className={styles.countRow}>
              <span className={styles.countLabel}>
                <span className={`${styles.miniStone} ${styles.miniBlack}`} />黑
              </span>
              <span className={styles.countValue}>
                {state.countingBlackScore} 目
              </span>
            </div>
            <div className={styles.countRow}>
              <span className={styles.countLabel}>
                <span className={`${styles.miniStone} ${styles.miniWhite}`} />白
              </span>
              <span className={styles.countValue}>
                {state.countingWhiteScore} 目 (含贴目 {state.komi})
              </span>
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
            <button
              className={`${styles.btn} ${styles.btnAccept}`}
              onClick={() => dispatch({ type: 'ACCEPT_COUNT' })}
            >
              接受
            </button>
            <button
              className={`${styles.btn} ${styles.btnReject}`}
              onClick={() => dispatch({ type: 'REJECT_COUNT' })}
            >
              拒绝
            </button>
          </div>
        </>
      )}

      {/* Try mode controls */}
      {isTry && (
        <div className={styles.buttons}>
          <button
            className={`${styles.btn} ${styles.btnUndo}`}
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={state.history.length === 0}
          >
            撤销
          </button>
        </div>
      )}

      {/* Post-game actions */}
      {state.gameOver && !isReview && (
        <div className={`${styles.buttons} ${styles.primaryControls}`}>
          <button
            className={`${styles.btn} ${styles.btnReview}`}
            onClick={() => dispatch({ type: 'ENTER_REVIEW' })}
          >
            复盘
          </button>
        </div>
      )}

      <p className={styles.panelHint}>
        棋子表情随气数变化：气越少越紧张。
      </p>
      <dialog
        ref={settingsRef}
        className={styles.settingsModal}
        aria-labelledby="settings-title"
        onClose={() => setShowSettings(false)}
      >
        <div className={styles.settingsHeader}>
          <span id="settings-title">对局设置</span>
          <button
            className={styles.modalClose}
            type="button"
            onClick={() => setShowSettings(false)}
            aria-label="关闭设置"
          >
            ×
          </button>
        </div>
        <div className={styles.settingsGrid}>
          <button
            className={styles.settingsButton}
            type="button"
            onClick={onBackToMenu}
          >
            返回棋室
          </button>
          <button
            className={styles.settingsButton}
            type="button"
            onClick={saveSGF}
            disabled={state.moves.length === 0}
          >
            导出 SGF 棋谱
          </button>
        </div>
      </dialog>
    </div>
  )
}

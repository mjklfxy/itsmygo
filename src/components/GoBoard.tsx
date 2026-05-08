import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { findGroup } from '../game/logic'
import { useGameContext } from '../context/GameContext'
import { StoneFace, type Expression, getExpression } from './StoneFace'
import { GoldenBurst } from './GoldenBurst'
import { TerritoryOverlay } from './TerritoryOverlay'
import styles from './GoBoard.module.css'

const PADDING = 28

function getStarPoints(size: number): [number, number][] {
  if (size === 9) return [[2,2],[6,2],[4,4],[2,6],[6,6]]
  if (size === 13) return [[3,3],[9,3],[6,6],[3,9],[9,9]]
  return [[3,3],[9,3],[15,3],[3,9],[9,9],[15,9],[3,15],[9,15],[15,15]]
}

const COORD_LETTERS = 'ABCDEFGHJKLMNOP'

// ─── Board ───
export default function GoBoard() {
  const { state, dispatch } = useGameContext()
  const { board, currentPlayer, lastMove, mode, countingMode, countingTerritory, countingDeadStones } = state

  const size = board.length
  const disabled = mode === 'review' || countingMode !== 'none'
  const countingTerr = countingMode === 'requested' ? countingTerritory : null
  const deadStones = countingMode === 'requested' ? countingDeadStones : undefined

  const [hover, setHover] = useState<[number, number] | null>(null)
  const [burstPos, setBurstPos] = useState<[number, number] | null>(null)
  const prevMoveRef = useRef(lastMove)
  const prevBoardRef = useRef(board)
  // Track when each stone was placed (for surprise expression)
  const stoneAgeRef = useRef<Map<string, number>>(new Map())
  // Track previous expression per stone to smooth transitions
  const prevExprRef = useRef<Map<string, Expression>>(new Map())

  // Clean up expression tracking when board identity changes (e.g., exit try mode)
  useEffect(() => {
    if (prevBoardRef.current !== board) {
      // Remove tracking for positions that no longer have a stone or have a different stone
      for (const [key] of prevExprRef.current) {
        const [x, y] = key.split(',').map(Number)
        if (key.includes('_')) continue // skip pending keys
        if (x >= size || y >= size || board[y]?.[x] === 0) {
          prevExprRef.current.delete(key)
          stoneAgeRef.current.delete(key)
        }
      }
      prevBoardRef.current = board
    }
  }, [board, size])

  useEffect(() => {
    if (lastMove && (prevMoveRef.current?.[0] !== lastMove[0] || prevMoveRef.current?.[1] !== lastMove[1])) {
      setBurstPos(lastMove)
      const key = `${lastMove[0]},${lastMove[1]}`
      stoneAgeRef.current.set(key, Date.now())
      prevExprRef.current.delete(key) // reset expression tracking for moved stone
      const t = setTimeout(() => setBurstPos(null), 800)
      prevMoveRef.current = lastMove
      return () => clearTimeout(t)
    }
    prevMoveRef.current = lastMove
  }, [lastMove])

  const libertyMap = useMemo(() => {
    const map = new Map<string, number>()
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        if (board[y][x] !== 0) {
          const g = findGroup(board, x, y)
          for (const k of g.stones) if (!map.has(k)) map.set(k, g.liberties.size)
        }
    return map
  }, [board, size])

  const cellSize = size <= 9 ? 52 : size <= 13 ? 40 : 28
  const boardPx = cellSize * (size - 1) + PADDING * 2
  const sr = cellSize * 0.47
  const starPoints = useMemo(() => getStarPoints(size), [size])
  const toP = (i: number) => PADDING + i * cellSize

  // Get expression with smoothing: surprise takes priority for 1s, then stable transitions
  const getSmoothExpr = useCallback((x: number, y: number, libs: number): Expression => {
    const key = `${x},${y}`
    const now = Date.now()
    const age = stoneAgeRef.current.get(key)

    // Newly placed stone → surprised for 800ms
    if (age && now - age < 800) return 'surprised'

    const target = getExpression(libs)
    const prev = prevExprRef.current.get(key)

    // No previous expression, just set it
    if (!prev) {
      prevExprRef.current.set(key, target)
      return target
    }

    // Same expression, keep it
    if (prev === target) return prev

    // Scared is always urgent, switch immediately
    if (target === 'scared') {
      prevExprRef.current.set(key, target)
      return target
    }

    // For non-scared transitions, require 2 consecutive reads at new level
    // This is a simple debounce: only switch if it's been stable
    // We store the "pending" expression and only commit on next render if it matches
    const pendingKey = key + '_pending'
    const pending = prevExprRef.current.get(pendingKey as any)
    if (pending === target) {
      // Two in a row, commit the change
      prevExprRef.current.delete(pendingKey as any)
      prevExprRef.current.set(key, target)
      return target
    } else {
      // First render at new level, store as pending
      prevExprRef.current.set(pendingKey as any, target)
      return prev // keep old expression for one more render
    }
  }, [])

  return (
    <svg className={styles.board} viewBox={`0 0 ${boardPx} ${boardPx}`}>
      <defs>
        <radialGradient id="bG" cx="35%" cy="28%">
          <stop offset="0%" stopColor="#aaa" />
          <stop offset="30%" stopColor="#666" />
          <stop offset="100%" stopColor="#1a1a2e" />
        </radialGradient>
        <radialGradient id="wG" cx="35%" cy="28%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="40%" stopColor="#faf4f7" />
          <stop offset="100%" stopColor="#e4cdd8" />
        </radialGradient>
        <filter id="ss" x="-20%" y="-10%" width="140%" height="140%">
          <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodOpacity="0.15" />
        </filter>
        <radialGradient id="goldGlow">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#FFAA00" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#FF8C00" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x={0} y={0} width={boardPx} height={boardPx} rx={10} ry={10} className={styles.boardBg} />

      {/* Grid lines */}
      {Array.from({ length: size }, (_, i) => (
        <g key={`g${i}`}>
          <line x1={toP(i)} y1={toP(0)} x2={toP(i)} y2={toP(size-1)} className={styles.gridLine} />
          <line x1={toP(0)} y1={toP(i)} x2={toP(size-1)} y2={toP(i)} className={styles.gridLine} />
        </g>
      ))}

      {/* Coordinates: top (letters) + left (numbers) */}
      {Array.from({ length: size }, (_, i) => (
        <g key={`c${i}`}>
          <text x={toP(i)} y={PADDING * 0.38} className={styles.coordText} textAnchor="middle">{COORD_LETTERS[i]}</text>
          <text x={PADDING * 0.24} y={toP(i)} className={styles.coordText} textAnchor="middle" dominantBaseline="central">{size - i}</text>
        </g>
      ))}

      {/* Star points */}
      {starPoints.map(([sx,sy]) => (
        <circle key={`s${sx}${sy}`} cx={toP(sx)} cy={toP(sy)} r={cellSize*0.07} className={styles.starPoint} />
      ))}

      {/* Stones */}
      {board.map((row, y) => row.map((stone, x) => {
        if (stone === 0) return null
        const key = `${x},${y}`
        const libs = libertyMap.get(key) ?? 2
        const isBurst = burstPos && burstPos[0] === x && burstPos[1] === y
        const expr = isBurst ? 'surprised' : getSmoothExpr(x, y, libs)
        const sx = toP(x), sy = toP(y)
        return (
          <g key={`st${key}`}>
            <circle cx={sx+1.5} cy={sy+2.5} r={sr} className={styles.stoneShadow} />
            <circle cx={sx} cy={sy} r={sr} fill={stone===1 ? 'url(#bG)' : 'url(#wG)'}
              stroke={stone===-1 ? '#ddd0d8' : 'none'} strokeWidth={stone===-1 ? 0.4 : 0}
              filter="url(#ss)" />
            <g transform={`translate(${sx},${sy})`}>
              <StoneFace expression={expr} stoneColor={stone} r={sr} />
            </g>
            {isBurst && <GoldenBurst cx={sx} cy={sy} r={sr} />}
          </g>
        )
      }))}

      {/* Hover preview */}
      {hover && !disabled && board[hover[1]][hover[0]] === 0 && (() => {
        const sx = toP(hover[0]), sy = toP(hover[1])
        return (
          <g opacity={0.35} style={{ pointerEvents: 'none' }}>
            <circle cx={sx} cy={sy} r={sr}
              fill={currentPlayer===1 ? 'url(#bG)' : 'url(#wG)'}
              stroke={currentPlayer===-1 ? '#ddd0d8' : 'none'} strokeWidth={0.4} />
            <g transform={`translate(${sx},${sy})`}>
              <StoneFace expression="surprised" stoneColor={currentPlayer} r={sr} />
            </g>
          </g>
        )
      })()}

      {/* Click targets */}
      {!disabled && !countingTerr && board.map((row, y) => row.map((_, x) => (
        <rect key={`a${x}${y}`}
          x={toP(x)-cellSize/2} y={toP(y)-cellSize/2}
          width={cellSize} height={cellSize} fill="transparent"
          style={{ cursor: board[y][x]===0 ? 'pointer' : 'default' }}
          onClick={() => dispatch({ type: 'PLACE_STONE', x, y })}
          onMouseEnter={() => setHover([x,y])}
          onMouseLeave={() => setHover(null)} />
      )))}

      {/* Territory overlay for 数子 */}
      {countingTerr && (
        <TerritoryOverlay board={board} countingTerritory={countingTerr}
          deadStones={deadStones || []} cellSize={cellSize} toP={toP} sr={sr} />
      )}
    </svg>
  )
}

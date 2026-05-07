import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import type { Board } from '../game/types'
import { findGroup } from '../game/logic'
import styles from './GoBoard.module.css'

import type { Stone } from '../game/types'

interface GoBoardProps {
  board: Board
  currentPlayer: 1 | -1
  lastMove: [number, number] | null
  onPlaceStone: (x: number, y: number) => void
  disabled?: boolean
  countingTerritory?: Board | null
  deadStones?: { x: number; y: number; color: Stone }[]
}

const PADDING = 28

function getStarPoints(size: number): [number, number][] {
  if (size === 9) return [[2,2],[6,2],[4,4],[2,6],[6,6]]
  if (size === 13) return [[3,3],[9,3],[6,6],[3,9],[9,9]]
  return [[3,3],[9,3],[15,3],[3,9],[9,9],[15,9],[3,15],[9,15],[15,15]]
}

const COORD_LETTERS = 'ABCDEFGHJKLMNOP'

type Expression = 'happy' | 'neutral' | 'worried' | 'scared' | 'surprised'

const FACES: Record<Expression, string> = {
  happy: '♥‿♥',
  neutral: '－_－',
  worried: '>_<',
  scared: 'T_T',
  surprised: 'O_O',
}

function getExpression(liberties: number): Expression {
  if (liberties >= 4) return 'happy'
  if (liberties >= 3) return 'neutral'
  if (liberties >= 2) return 'worried'
  return 'scared'
}

// ─── Kaomoji Stone Face ───
function StoneFace({ expression, stoneColor, r }: { expression: Expression; stoneColor: number; r: number }) {
  const isB = stoneColor === 1
  const face = FACES[expression]
  const col = isB ? 'rgba(255,255,255,0.92)' : 'rgba(40,40,50,0.85)'
  const fontSize = expression === 'surprised' ? r * 0.52 : r * 0.58

  return (
    <g>
      <text
        x={0}
        y={0}
        fontSize={fontSize}
        fill={col}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Courier New', 'Consolas', monospace"
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        {face}
      </text>
      {/* Blush for happy */}
      {expression === 'happy' && (
        <>
          <circle cx={-r * 0.38} cy={r * 0.18} r={r * 0.07}
            fill={isB ? 'rgba(255,140,170,0.45)' : 'rgba(255,120,160,0.3)'} />
          <circle cx={r * 0.38} cy={r * 0.18} r={r * 0.07}
            fill={isB ? 'rgba(255,140,170,0.45)' : 'rgba(255,120,160,0.3)'} />
        </>
      )}
      {/* Animated tears for scared */}
      {expression === 'scared' && (
        <>
          <ellipse cx={-r * 0.22} cy={r * 0.22} rx={r * 0.035} ry={r * 0.05} fill="rgba(60,160,255,0.7)">
            <animate attributeName="cy" dur="1s" repeatCount="indefinite"
              values={`${r * 0.22};${r * 0.38};${r * 0.22}`} />
            <animate attributeName="opacity" dur="1s" repeatCount="indefinite"
              values="0.7;0;0.7" />
          </ellipse>
          <ellipse cx={r * 0.22} cy={r * 0.26} rx={r * 0.035} ry={r * 0.05} fill="rgba(60,160,255,0.6)">
            <animate attributeName="cy" dur="1.1s" repeatCount="indefinite"
              values={`${r * 0.26};${r * 0.42};${r * 0.26}`} />
            <animate attributeName="opacity" dur="1.1s" repeatCount="indefinite"
              values="0.6;0;0.6" />
          </ellipse>
        </>
      )}
    </g>
  )
}

// ─── Golden Burst: pure SVG animate ───
function GoldenBurst({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const items = useMemo(() => {
    let seed = Math.round(cx * 137 + cy * 311)
    const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed & 0x7fffffff) / 2147483647 }

    const result: { x: number; y: number; ex: number; ey: number; size: number; delay: number; dur: number; shape: number }[] = []

    for (let i = 0; i < 30; i++) {
      const angle = rand() * Math.PI * 2
      const distStart = r * 1.05 + rand() * r * 0.1
      const distEnd = r * 1.4 + rand() * r * 0.6
      result.push({
        x: cx + Math.cos(angle) * distStart,
        y: cy + Math.sin(angle) * distStart,
        ex: cx + Math.cos(angle) * distEnd,
        ey: cy + Math.sin(angle) * distEnd,
        size: r * 0.06 + rand() * r * 0.1,
        delay: rand() * 0.15,
        dur: 0.4 + rand() * 0.3,
        shape: Math.floor(rand() * 5),
      })
    }
    return result
  }, [cx, cy, r])

  const gold = '#FFD700'
  const goldL = '#FFF3B0'
  const goldB = '#FFAA00'

  return (
    <g>
      <circle cx={cx} cy={cy} r={r * 1.05} fill="none" stroke={gold} strokeWidth="3.5" opacity="1">
        <animate attributeName="opacity" values="1;0.7;0" dur="0.5s" fill="freeze" />
        <animate attributeName="stroke-width" values="4;1.5;0" dur="0.5s" fill="freeze" />
      </circle>
      <circle cx={cx} cy={cy} r={r * 0.95} fill="none" stroke={goldL} strokeWidth="2" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.3;0" dur="0.35s" fill="freeze" />
      </circle>

      {items.map((sp, i) => (
        <g key={i}>
          {sp.shape === 0 && (
            <path d={`M ${sp.x} ${sp.y - sp.size} L ${sp.x + sp.size*0.5} ${sp.y} L ${sp.x} ${sp.y + sp.size} L ${sp.x - sp.size*0.5} ${sp.y} Z`}
              fill={gold} stroke={goldL} strokeWidth="0.3">
              <animate attributeName="opacity" values={`0;1;0.8;0`} begin={`${sp.delay}s`} dur={`${sp.dur}s`} fill="freeze" />
              <animateTransform attributeName="transform" type="translate"
                values={`0,0; ${(sp.ex-sp.x)*0.5},${(sp.ey-sp.y)*0.5}; ${sp.ex-sp.x},${sp.ey-sp.y}`}
                begin={`${sp.delay}s`} dur={`${sp.dur}s`} fill="freeze" />
              <animateTransform attributeName="transform" type="rotate" additive="sum"
                values="0;180" begin={`${sp.delay}s`} dur={`${sp.dur}s`} fill="freeze" />
            </path>
          )}
          {sp.shape === 1 && (
            <text x={sp.x} y={sp.y} fontSize={sp.size * 1.8} fill={goldL} textAnchor="middle" dominantBaseline="central">✦
              <animate attributeName="opacity" values={`0;1;0.6;0`} begin={`${sp.delay}s`} dur={`${sp.dur}s`} fill="freeze" />
              <animateTransform attributeName="transform" type="translate"
                values={`0,0; ${sp.ex-sp.x},${sp.ey-sp.y}`}
                begin={`${sp.delay}s`} dur={`${sp.dur}s`} fill="freeze" />
            </text>
          )}
          {sp.shape === 2 && (
            <g>
              <line x1={sp.x-sp.size} y1={sp.y} x2={sp.x+sp.size} y2={sp.y} stroke={gold} strokeWidth={sp.size*0.35} strokeLinecap="round">
                <animate attributeName="opacity" values={`0;1;0.5;0`} begin={`${sp.delay}s`} dur={`${sp.dur}s`} fill="freeze" />
              </line>
              <line x1={sp.x} y1={sp.y-sp.size} x2={sp.x} y2={sp.y+sp.size} stroke={gold} strokeWidth={sp.size*0.35} strokeLinecap="round">
                <animate attributeName="opacity" values={`0;1;0.5;0`} begin={`${sp.delay}s`} dur={`${sp.dur}s`} fill="freeze" />
              </line>
              <animateTransform attributeName="transform" type="translate"
                values={`0,0; ${sp.ex-sp.x},${sp.ey-sp.y}`}
                begin={`${sp.delay}s`} dur={`${sp.dur}s`} fill="freeze" />
            </g>
          )}
          {sp.shape === 3 && (
            <line x1={sp.x} y1={sp.y-sp.size} x2={sp.x} y2={sp.y+sp.size*0.3}
              stroke={goldB} strokeWidth={sp.size*0.3} strokeLinecap="round">
              <animate attributeName="opacity" values={`0;1;0.4;0`} begin={`${sp.delay}s`} dur={`${sp.dur}s`} fill="freeze" />
              <animateTransform attributeName="transform" type="translate"
                values={`0,0; ${sp.ex-sp.x},${sp.ey-sp.y}`}
                begin={`${sp.delay}s`} dur={`${sp.dur}s`} fill="freeze" />
            </line>
          )}
          {sp.shape === 4 && (
            <circle cx={sp.x} cy={sp.y} r={sp.size * 0.35} fill={goldL} stroke={gold} strokeWidth="0.3">
              <animate attributeName="opacity" values={`0;1;0.7;0`} begin={`${sp.delay}s`} dur={`${sp.dur}s`} fill="freeze" />
              <animateTransform attributeName="transform" type="translate"
                values={`0,0; ${sp.ex-sp.x},${sp.ey-sp.y}`}
                begin={`${sp.delay}s`} dur={`${sp.dur}s`} fill="freeze" />
            </circle>
          )}
        </g>
      ))}
    </g>
  )
}

// ─── Board ───
export default function GoBoard({ board, currentPlayer, lastMove, onPlaceStone, disabled, countingTerritory, deadStones }: GoBoardProps) {
  const size = board.length
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
      {!disabled && !countingTerritory && board.map((row, y) => row.map((_, x) => (
        <rect key={`a${x}${y}`}
          x={toP(x)-cellSize/2} y={toP(y)-cellSize/2}
          width={cellSize} height={cellSize} fill="transparent"
          style={{ cursor: board[y][x]===0 ? 'pointer' : 'default' }}
          onClick={() => board[y][x]===0 && onPlaceStone(x, y)}
          onMouseEnter={() => setHover([x,y])}
          onMouseLeave={() => setHover(null)} />
      )))}

      {/* Territory overlay for 数子 */}
      {countingTerritory && (() => {
        const deadSet = new Set((deadStones || []).map(s => `${s.x},${s.y}`))
        return board.map((row, y) => row.map((stone, x) => {
          const tOwner = countingTerritory[y][x]
          const sx = toP(x), sy = toP(y)
          const isDead = deadSet.has(`${x},${y}`)

          // Dead stone: ownership says this belongs to opponent
          if (stone !== 0 && isDead) {
            return (
              <g key={`t${x}${y}`}>
                <circle cx={sx} cy={sy} r={sr * 0.85}
                  fill="rgba(220,50,50,0.2)" stroke="rgba(200,40,40,0.6)" strokeWidth={1} />
                <line x1={sx - sr * 0.35} y1={sy - sr * 0.35} x2={sx + sr * 0.35} y2={sy + sr * 0.35}
                  stroke="rgba(200,40,40,0.8)" strokeWidth={1.5} strokeLinecap="round" />
                <line x1={sx + sr * 0.35} y1={sy - sr * 0.35} x2={sx - sr * 0.35} y2={sy + sr * 0.35}
                  stroke="rgba(200,40,40,0.8)" strokeWidth={1.5} strokeLinecap="round" />
              </g>
            )
          }

          // Territory marker: empty point assigned to a color
          if (stone === 0 && tOwner !== 0) {
            return (
              <rect key={`t${x}${y}`}
                x={sx - cellSize * 0.4} y={sy - cellSize * 0.4}
                width={cellSize * 0.8} height={cellSize * 0.8}
                rx={3} ry={3}
                fill={tOwner === 1 ? 'rgba(50,50,50,0.25)' : 'rgba(220,210,220,0.4)'}
                stroke={tOwner === 1 ? 'rgba(50,50,50,0.5)' : 'rgba(180,170,180,0.5)'}
                strokeWidth={0.5}
              />
            )
          }
          return null
        }))
      })()}
    </svg>
  )
}

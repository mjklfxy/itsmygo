import { useMemo, useState, type KeyboardEvent } from 'react'
import { findGroup } from '../../game/logic'
import { useGameContext } from '../../hooks/useGameContext'
import { StoneFace } from './StoneFace'
import { getExpression } from './stoneFaceExpressions'
import { GoldenBurst } from './GoldenBurst'
import { TerritoryOverlay } from './TerritoryOverlay'
import styles from './GoBoard.module.css'

const PADDING = 32
const COORD_LETTERS = 'ABCDEFGHJKLMNOPQRST'

function getStarPoints(size: number): [number, number][] {
  if (size === 9)
    return [
      [2, 2],
      [6, 2],
      [4, 4],
      [2, 6],
      [6, 6],
    ]
  if (size === 13)
    return [
      [3, 3],
      [9, 3],
      [6, 6],
      [3, 9],
      [9, 9],
    ]
  return [
    [3, 3],
    [9, 3],
    [15, 3],
    [3, 9],
    [9, 9],
    [15, 9],
    [3, 15],
    [9, 15],
    [15, 15],
  ]
}

/** Renders the position and accessible intersection targets; the reducer validates each move. */
export default function GoBoard() {
  const { state, dispatch } = useGameContext()
  const {
    board,
    currentPlayer,
    lastMove,
    mode,
    countingMode,
    countingTerritory,
    countingDeadStones,
  } = state
  const size = board.length
  const aiTurn =
    mode === 'play' &&
    state.aiMode !== 'none' &&
    state.aiMode.endsWith(currentPlayer === 1 ? 'black' : 'white')
  const disabled =
    mode === 'review' || countingMode !== 'none' || state.gameOver || aiTurn
  const countingTerr = countingMode === 'requested' ? countingTerritory : null
  const [hover, setHover] = useState<[number, number] | null>(null)
  const [focus, setFocus] = useState<[number, number]>([
    Math.floor(size / 2),
    Math.floor(size / 2),
  ])

  const libertyMap = useMemo(() => {
    const map = new Map<string, number>()
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] !== 0 && !map.has(`${x},${y}`)) {
          const group = findGroup(board, x, y)
          for (const key of group.stones) map.set(key, group.liberties.size)
        }
      }
    }
    return map
  }, [board, size])

  const cellSize = size <= 9 ? 52 : size <= 13 ? 40 : 28
  const boardPx = cellSize * (size - 1) + PADDING * 2
  const sr = cellSize * 0.455
  const toP = (i: number) => PADDING + i * cellSize

  /** Moves a single keyboard focus across intersections; Enter/Space requests a legal move through the reducer. */
  function handleIntersectionKeyDown(
    event: KeyboardEvent<SVGRectElement>,
    x: number,
    y: number,
  ) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (board[y][x] === 0) dispatch({ type: 'PLACE_STONE', x, y })
      return
    }
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const direction = directions[event.key]
    if (!direction) return
    event.preventDefault()
    const nextX = Math.max(0, Math.min(size - 1, x + direction[0]))
    const nextY = Math.max(0, Math.min(size - 1, y + direction[1]))
    const targets =
      event.currentTarget.ownerSVGElement?.querySelectorAll<SVGRectElement>(
        '[role="button"]',
      )
    targets?.[nextY * size + nextX]?.focus()
  }

  return (
    <svg
      className={styles.board}
      viewBox={`0 0 ${boardPx} ${boardPx}`}
      role="group"
      aria-label={`${size}路围棋棋盘，方向键选择位置，回车落子`}
    >
      <defs>
        <radialGradient id="bG" cx="32%" cy="22%" r="78%">
          <stop offset="0%" stopColor="#697674" />
          <stop offset="38%" stopColor="#333e3e" />
          <stop offset="85%" stopColor="#172122" />
          <stop offset="100%" stopColor="#293536" />
        </radialGradient>
        <radialGradient id="wG" cx="32%" cy="22%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#fffdf3" />
          <stop offset="88%" stopColor="#deded1" />
          <stop offset="100%" stopColor="#f5f2df" />
        </radialGradient>
        <linearGradient id="wood" x2="1" y2="1">
          <stop stopColor="#f0d19b" />
          <stop offset="1" stopColor="#dfb77c" />
        </linearGradient>
        <pattern
          id="grain"
          width="120"
          height="9"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 2 Q30 0 60 2 T120 2 M0 6 Q60 9 120 6"
            fill="none"
            stroke="#976c36"
            strokeOpacity=".07"
            strokeWidth=".6"
          />
        </pattern>
      </defs>
      <rect width={boardPx} height={boardPx} rx={5} fill="url(#wood)" />
      <rect width={boardPx} height={boardPx} rx={5} fill="url(#grain)" />
      {Array.from({ length: size }, (_, i) => (
        <g key={`grid-${i}`}>
          <line
            x1={toP(i)}
            y1={toP(0)}
            x2={toP(i)}
            y2={toP(size - 1)}
            className={styles.gridLine}
          />
          <line
            x1={toP(0)}
            y1={toP(i)}
            x2={toP(size - 1)}
            y2={toP(i)}
            className={styles.gridLine}
          />
          <text
            x={toP(i)}
            y={13}
            className={styles.coordText}
            textAnchor="middle"
          >
            {COORD_LETTERS[i]}
          </text>
          <text
            x={12}
            y={toP(i)}
            className={styles.coordText}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {size - i}
          </text>
          <text
            x={toP(i)}
            y={boardPx - 8}
            className={styles.coordText}
            textAnchor="middle"
          >
            {COORD_LETTERS[i]}
          </text>
          <text
            x={boardPx - 12}
            y={toP(i)}
            className={styles.coordText}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {size - i}
          </text>
        </g>
      ))}
      {getStarPoints(size).map(([x, y]) => (
        <circle
          key={`star-${x}-${y}`}
          cx={toP(x)}
          cy={toP(y)}
          r={cellSize * 0.065}
          fill="#82623e"
        />
      ))}
      {board.map((row, y) =>
        row.map((stone, x) => {
          if (stone === 0) return null
          const sx = toP(x),
            sy = toP(y)
          const isLast = lastMove?.[0] === x && lastMove[1] === y
          return (
            <g key={`${x},${y}`} data-stone={`${x},${y}`}>
              <ellipse
                cx={sx + 1}
                cy={sy + sr * 0.18}
                rx={sr * 1.03}
                ry={sr * 0.98}
                fill="#503920"
                opacity=".22"
              />
              <circle
                cx={sx}
                cy={sy}
                r={sr}
                fill={stone === 1 ? 'url(#bG)' : 'url(#wG)'}
                stroke={stone === 1 ? '#182526' : '#c5bfa6'}
                strokeWidth=".6"
              />
              <path
                d={`M ${sx - sr * 0.65} ${sy - sr * 0.43} Q ${sx - sr * 0.3} ${sy - sr * 0.87} ${sx + sr * 0.18} ${sy - sr * 0.78}`}
                fill="none"
                stroke="white"
                strokeWidth={sr * 0.065}
                strokeLinecap="round"
                opacity={stone === 1 ? 0.23 : 0.85}
              />
              <g transform={`translate(${sx},${sy})`}>
                <StoneFace
                  expression={getExpression(libertyMap.get(`${x},${y}`) ?? 2)}
                  stoneColor={stone}
                  r={sr}
                />
              </g>
              {isLast && (
                <circle
                  cx={sx + sr * 0.62}
                  cy={sy - sr * 0.65}
                  r={sr * 0.14}
                  fill="#d77d3d"
                  stroke="#fff7df"
                  strokeWidth={sr * 0.055}
                />
              )}
            </g>
          )
        }),
      )}
      {hover && !disabled && board[hover[1]]?.[hover[0]] === 0 && (
        <g pointerEvents="none">
          <circle
            cx={toP(hover[0])}
            cy={toP(hover[1])}
            r={sr + 3}
            fill="none"
            stroke="#47664c"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <circle
            cx={toP(hover[0])}
            cy={toP(hover[1])}
            r={sr}
            fill={currentPlayer === 1 ? 'url(#bG)' : 'url(#wG)'}
            opacity=".5"
          />
        </g>
      )}
      {!disabled &&
        board.map((row, y) =>
          row.map((stone, x) => (
            <rect
              key={`target-${x}-${y}`}
              x={toP(x) - cellSize / 2}
              y={toP(y) - cellSize / 2}
              width={cellSize}
              height={cellSize}
              fill="transparent"
              className={styles.target}
              role="button"
              aria-label={`${COORD_LETTERS[x]}${size - y}${stone === 0 ? '，落子' : stone === 1 ? '，黑子' : '，白子'}`}
              aria-disabled={stone !== 0}
              tabIndex={focus[0] === x && focus[1] === y ? 0 : -1}
              style={{ cursor: stone === 0 ? 'pointer' : 'default' }}
              onClick={() => {
                if (stone === 0) dispatch({ type: 'PLACE_STONE', x, y })
              }}
              onMouseEnter={() => setHover([x, y])}
              onMouseLeave={() => setHover(null)}
              onFocus={() => {
                setFocus([x, y])
                setHover([x, y])
              }}
              onBlur={() => setHover(null)}
              onKeyDown={(event) => handleIntersectionKeyDown(event, x, y)}
            />
          )),
        )}
      {countingTerr && (
        <TerritoryOverlay
          board={board}
          countingTerritory={countingTerr}
          deadStones={countingDeadStones}
          cellSize={cellSize}
          toP={toP}
          sr={sr}
        />
      )}
      <GoldenBurst
        board={board}
        historyLength={state.history.length}
        mode={mode}
        cellSize={cellSize}
        padding={PADDING}
        r={sr}
      />
    </svg>
  )
}

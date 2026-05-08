import type { Board } from '../game/types'
import type { Stone } from '../game/types'

interface TerritoryOverlayProps {
  board: Board
  countingTerritory: Board
  deadStones: { x: number; y: number; color: Stone }[]
  cellSize: number
  toP: (i: number) => number
  sr: number
}

export function TerritoryOverlay({ board, countingTerritory, deadStones, cellSize, toP, sr }: TerritoryOverlayProps) {
  const deadSet = new Set(deadStones.map(s => `${s.x},${s.y}`))
  return <>{board.map((row, y) => row.map((stone, x) => {
    const tOwner = countingTerritory[y][x]
    const sx = toP(x), sy = toP(y)
    const isDead = deadSet.has(`${x},${y}`)

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
  }))}</>
}

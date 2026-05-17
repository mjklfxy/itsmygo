import styles from './StoneFace.module.css'
import { FACES, type Expression } from './stoneFaceExpressions'

export function StoneFace({ expression, stoneColor, r }: { expression: Expression; stoneColor: number; r: number }) {
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
      {expression === 'happy' && (
        <>
          <circle cx={-r * 0.38} cy={r * 0.18} r={r * 0.07}
            fill={isB ? 'rgba(255,140,170,0.45)' : 'rgba(255,120,160,0.3)'} />
          <circle cx={r * 0.38} cy={r * 0.18} r={r * 0.07}
            fill={isB ? 'rgba(255,140,170,0.45)' : 'rgba(255,120,160,0.3)'} />
        </>
      )}
      {expression === 'scared' && (
        <>
          <ellipse cx={-r * 0.22} cy={r * 0.22} rx={r * 0.035} ry={r * 0.05}
            fill="rgba(60,160,255,0.7)" className={styles.tear}
            style={{ animationDelay: '0s' } as React.CSSProperties} />
          <ellipse cx={r * 0.22} cy={r * 0.26} rx={r * 0.035} ry={r * 0.05}
            fill="rgba(60,160,255,0.6)" className={styles.tear}
            style={{ animationDelay: '0.3s' } as React.CSSProperties} />
        </>
      )}
    </g>
  )
}

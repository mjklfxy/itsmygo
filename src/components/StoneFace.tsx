export type Expression = 'happy' | 'neutral' | 'worried' | 'scared' | 'surprised'

export const FACES: Record<Expression, string> = {
  happy: '♥‿♥',
  neutral: '－_－',
  worried: '>_<',
  scared: 'T_T',
  surprised: 'O_O',
}

export function getExpression(liberties: number): Expression {
  if (liberties >= 4) return 'happy'
  if (liberties >= 3) return 'neutral'
  if (liberties >= 2) return 'worried'
  return 'scared'
}

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

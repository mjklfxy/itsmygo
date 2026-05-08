import { useMemo } from 'react'

export function GoldenBurst({ cx, cy, r }: { cx: number; cy: number; r: number }) {
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

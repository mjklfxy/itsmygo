import { useRef, useLayoutEffect, useMemo } from 'react'
import gsap from 'gsap'

export function GoldenBurst({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const groupRef = useRef<SVGGElement>(null)

  const sparks = useMemo(() => {
    const seed = Math.round(cx * 137 + cy * 311)
    const rand = (step: number) => {
      const x = Math.sin(seed + step * 12.9898) * 43758.5453
      return x - Math.floor(x)
    }

    const colors = ['#FFD700', '#FFF3B0', '#FFAA00']

    return Array.from({ length: 25 }, (_, i) => {
      const offset = i * 8
      const angle = rand(offset) * Math.PI * 2
      const edgeR = r * (0.9 + rand(offset + 1) * 0.12)
      const speed = r * (2.5 + rand(offset + 2) * 3.5)
      const size = r * 0.04 + rand(offset + 3) * r * 0.12
      return {
        sx: Math.cos(angle) * edgeR,
        sy: Math.sin(angle) * edgeR,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - r * 1.5,
        gravity: r * (10 + rand(offset + 4) * 8),
        size,
        shape: Math.floor(rand(offset + 5) * 5),
        color: colors[Math.floor(rand(offset + 6) * 3)],
        duration: 0.4 + rand(offset + 7) * 0.25,
      }
    })
  }, [cx, cy, r])

  useLayoutEffect(() => {
    if (!groupRef.current) return
    const root = groupRef.current
    const tl = gsap.timeline()

    // Flash + ring — only GSAP part, lightweight
    const flash = root.querySelector('.flash')
    if (flash) {
      tl.fromTo(flash,
        { attr: { r: r * 0.2 }, opacity: 1 },
        { attr: { r: r * 1.5 }, opacity: 0, duration: 0.5, ease: 'power3.out' },
        0
      )
    }
    const ring = root.querySelector('.ring-flash')
    if (ring) {
      tl.fromTo(ring,
        { attr: { r: r * 0.8, 'stroke-width': 3 }, opacity: 0.8 },
        { attr: { r: r * 2.0, 'stroke-width': 0 }, opacity: 0, duration: 0.35, ease: 'power2.out' },
        0
      )
    }

    // Sparks — pure RAF parabolic physics, no GSAP
    const els = root.querySelectorAll('.spark-inner')
    const n = els.length
    if (n === 0) return () => { tl.kill() }

    let start: number | null = null
    let raf = 0

    const tick = (now: number) => {
      if (!start) start = now
      const t = (now - start) / 1000

      let allDone = true
      for (let i = 0; i < n; i++) {
        const s = sparks[i]
        const p = Math.min(t / s.duration, 1)

        // Parabolic trajectory: x = vx*t, y = vy*t + 0.5*g*t²
        const px = s.vx * t
        const py = s.vy * t + 0.5 * s.gravity * t * t

        // Fade out near end, shrink
        const alpha = p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4
        const scale = 1.3 - p * 1.0

        const el = els[i] as SVGElement
        el.setAttribute('transform', `translate(${px.toFixed(1)}, ${py.toFixed(1)}) scale(${scale.toFixed(2)})`)
        el.setAttribute('opacity', alpha.toFixed(2))

        if (p < 1) allDone = false
      }

      if (!allDone) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      tl.kill()
    }
  }, [cx, cy, r, sparks])

  return (
    <g ref={groupRef}>
      <circle cx={cx} cy={cy} r={r * 0.2} fill="#FFD700" opacity={0} className="flash" />
      <circle cx={cx} cy={cy} r={r * 0.8} fill="none" stroke="#FFE44D" strokeWidth={3} opacity={0} className="ring-flash" />

      {sparks.map((s, i) => (
        <g key={i} transform={`translate(${cx + s.sx}, ${cy + s.sy})`}>
          <g className="spark-inner">
            {s.shape === 0 && (
              <path
                d={`M 0 ${-s.size} L ${s.size * 0.6} 0 L 0 ${s.size} L ${-s.size * 0.6} 0 Z`}
                fill={s.color} />
            )}
            {s.shape === 1 && (
              <text fontSize={s.size * 2.5} fill={s.color}
                textAnchor="middle" dominantBaseline="central">✦</text>
            )}
            {s.shape === 2 && (
              <g>
                <line x1={-s.size} y1={0} x2={s.size} y2={0}
                  stroke={s.color} strokeWidth={s.size * 0.3} strokeLinecap="round" />
                <line x1={0} y1={-s.size} x2={0} y2={s.size}
                  stroke={s.color} strokeWidth={s.size * 0.3} strokeLinecap="round" />
              </g>
            )}
            {s.shape === 3 && (
              <circle r={s.size * 0.5} fill={s.color} />
            )}
            {s.shape === 4 && (
              <line x1={0} y1={-s.size} x2={0} y2={s.size * 0.4}
                stroke={s.color} strokeWidth={s.size * 0.25} strokeLinecap="round" />
            )}
          </g>
        </g>
      ))}
    </g>
  )
}

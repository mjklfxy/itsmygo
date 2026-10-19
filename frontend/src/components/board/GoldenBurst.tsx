import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import type { Board, GameState } from '../../game/types'

interface GoldenBurstProps {
  board: Board
  historyLength: number
  mode: GameState['mode']
  cellSize: number
  padding: number
  r: number
}

/** Animates only new moves, not undo, record loading or review; owns and cleans up transient SVG effects. */
export function GoldenBurst({
  board,
  historyLength,
  mode,
  cellSize,
  padding,
  r,
}: GoldenBurstProps) {
  const layerRef = useRef<SVGGElement>(null)
  const previous = useRef({ board, historyLength, mode })

  useLayoutEffect(() => {
    const before = previous.current
    previous.current = { board, historyLength, mode }
    const layer = layerRef.current
    if (
      !layer ||
      mode === 'review' ||
      before.mode !== mode ||
      historyLength !== before.historyLength + 1 ||
      before.board.length !== board.length ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return

    // Effect nodes live outside React's stone tree so captured stones can finish fading after removal.
    const context = gsap.context(() => {
      for (let y = 0; y < board.length; y++) {
        for (let x = 0; x < board.length; x++) {
          const oldStone = before.board[y][x]
          const stone = board[y][x]
          if (stone === oldStone) continue
          const cx = padding + x * cellSize
          const cy = padding + y * cellSize
          if (stone !== 0) {
            const target = layer.ownerSVGElement?.querySelector(
              `[data-stone="${x},${y}"]`,
            )
            if (target)
              gsap.fromTo(
                target,
                {
                  scale: 0.65,
                  y: -r * 0.65,
                  opacity: 0.3,
                  svgOrigin: `${cx} ${cy}`,
                },
                {
                  scale: 1,
                  y: 0,
                  opacity: 1,
                  duration: 0.48,
                  ease: 'back.out(2.8)',
                },
              )
            const ring = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'circle',
            )
            ring.setAttribute('cx', String(cx))
            ring.setAttribute('cy', String(cy))
            ring.setAttribute('r', String(r * 0.8))
            ring.setAttribute('fill', 'none')
            ring.setAttribute('stroke', '#fff6ce')
            ring.setAttribute('stroke-width', '2')
            layer.appendChild(ring)
            gsap.to(ring, {
              attr: { r: r * 1.9 },
              opacity: 0,
              duration: 0.55,
              onComplete: () => ring.remove(),
            })
            for (let i = 0; i < 8; i++) {
              const angle = (i * Math.PI) / 4 + 0.2
              const spark = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'circle',
              )
              spark.setAttribute('cx', String(cx + Math.cos(angle) * r))
              spark.setAttribute('cy', String(cy + Math.sin(angle) * r))
              spark.setAttribute('r', String(r * (i % 2 ? 0.045 : 0.075)))
              spark.setAttribute('fill', i % 2 ? '#fffbe6' : '#c57a35')
              layer.appendChild(spark)
              gsap.to(spark, {
                x: Math.cos(angle) * r * 0.9,
                y: Math.sin(angle) * r * 0.9,
                opacity: 0,
                duration: 0.5,
                delay: 0.04,
                ease: 'power2.out',
                onComplete: () => spark.remove(),
              })
            }
          } else if (oldStone !== 0) {
            const ghost = document.createElementNS(
              'http://www.w3.org/2000/svg',
              'circle',
            )
            ghost.setAttribute('cx', String(cx))
            ghost.setAttribute('cy', String(cy))
            ghost.setAttribute('r', String(r))
            ghost.setAttribute('fill', oldStone === 1 ? 'url(#bG)' : 'url(#wG)')
            layer.appendChild(ghost)
            gsap.to(ghost, {
              attr: { r: r * 0.3 },
              y: -r * 0.8,
              opacity: 0,
              duration: 0.45,
              ease: 'power2.in',
              onComplete: () => ghost.remove(),
            })
          }
        }
      }
    }, layer)
    return () => {
      context.revert()
      layer.replaceChildren()
    }
  }, [board, historyLength, mode, cellSize, padding, r])

  return <g ref={layerRef} pointerEvents="none" aria-hidden="true" />
}

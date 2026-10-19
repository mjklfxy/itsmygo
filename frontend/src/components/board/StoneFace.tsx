import type { Expression } from './stoneFaceExpressions'

/**
 * Draws the stone faces.
 *
 * Geometry scales with the stone radius, but every stroked feature uses
 * `vector-effect: non-scaling-stroke` so its line weight is expressed in screen pixels.
 * With stone-relative widths the mouth and brows collapsed to ~1px on a 19x19 board
 * (stone radius ~16px) and the face read as a grey smudge.
 */
const STROKE_PX = 1.4

/** Blush and pupils are filled, so they cannot use non-scaling-stroke; drop them when too small. */
const DETAIL_MIN_RADIUS = 15

export function StoneFace({
  expression,
  stoneColor,
  r,
}: {
  expression: Expression
  stoneColor: number
  r: number
}) {
  const color = stoneColor === 1 ? '#f8f3df' : '#344541'
  const worried = expression === 'worried' || expression === 'scared'
  const showDetail = r >= DETAIL_MIN_RADIUS

  const line = {
    fill: 'none',
    stroke: color,
    strokeWidth: STROKE_PX,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  }

  return (
    <g transform={`scale(${r})`} pointerEvents="none">
      {expression === 'happy' ? (
        <path
          d="M-.42 -.02 Q-.28 -.24 -.15 -.02 M.15 -.02 Q.28 -.24 .42 -.02"
          {...line}
        />
      ) : worried ? (
        <path d="M-.4 -.14 L-.2 -.03 L-.4 .03 M.4 -.14 L.2 -.03 L.4 .03" {...line} />
      ) : (
        <g fill={color} stroke="none">
          <circle cx="-.27" cy="-.04" r={showDetail ? '.085' : '.11'} />
          <circle cx=".27" cy="-.04" r={showDetail ? '.085' : '.11'} />
        </g>
      )}
      {expression === 'surprised' ? (
        <ellipse cx="0" cy=".2" rx=".075" ry=".105" {...line} />
      ) : (
        <path
          d={worried ? 'M-.13 .24 Q0 .09 .13 .24' : 'M-.15 .14 Q0 .33 .15 .14'}
          {...line}
        />
      )}
      {showDetail && (
        <g fill="#e99683" stroke="none" opacity={stoneColor === 1 ? '.6' : '.45'}>
          <ellipse cx="-.45" cy=".17" rx=".1" ry=".05" />
          <ellipse cx=".45" cy=".17" rx=".1" ry=".05" />
        </g>
      )}
      {expression === 'scared' && (
        <path
          d="M.52 -.18 Q.7 .03 .54 .07 Q.42 .06 .52 -.18"
          fill="#85c8d3"
          stroke="none"
        />
      )}
    </g>
  )
}

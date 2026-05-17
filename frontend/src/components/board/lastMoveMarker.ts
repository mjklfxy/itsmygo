export interface LastMoveMarker {
  dx: number
  dy: number
  size: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function roundMarkerValue(value: number): number {
  return Math.round(value * 100) / 100
}

export function getLastMoveMarker(
  lastMove: [number, number] | null,
  x: number,
  y: number,
  stoneRadius: number,
): LastMoveMarker | null {
  if (!lastMove || lastMove[0] !== x || lastMove[1] !== y) return null

  return {
    dx: roundMarkerValue(stoneRadius * 0.32),
    dy: roundMarkerValue(-stoneRadius * 0.68),
    size: roundMarkerValue(clamp(stoneRadius * 0.38, 6, 9)),
  }
}

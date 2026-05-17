/**
 * GTP coordinate conversion.
 * GTP columns: A-H, J-T (skip 'I'). Rows: 1-indexed from bottom.
 * Internal coords: (x, y) with y=0 at top, x=0 at left.
 */

const GTP_COLUMNS = 'ABCDEFGHJKLMNOPQRST'

/** Convert internal (x, y) to GTP coordinate string like "D4" */
export function moveToGtp(x: number, y: number, size: number): string {
  const col = GTP_COLUMNS[x]
  const row = size - y // GTP row 1 = bottom of board
  return `${col}${row}`
}

/** Convert GTP coordinate string like "D4" to internal (x, y) */
export function gtpToMove(coord: string, size: number): [number, number] {
  const col = coord.charAt(0)
  const row = parseInt(coord.substring(1), 10)
  const x = GTP_COLUMNS.indexOf(col)
  const y = size - row
  if (x === -1 || y < 0 || y >= size) {
    throw new Error(`Invalid GTP coordinate: ${coord}`)
  }
  return [x, y]
}

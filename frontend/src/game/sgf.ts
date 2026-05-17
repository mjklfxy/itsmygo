import type { Move } from './types'

const COORD = 'abcdefghijklmnopqrstuvwxyz'

export function movesToSGF(moves: Move[], size: number, result?: string, komi: number = 7.5): string {
  let sgf = `(;GM[1]FF[4]CA[UTF-8]SZ[${size}]KM[${komi}]`
  if (result) sgf += `RE[${result}]`

  for (const m of moves) {
    if (m.pass) {
      sgf += `;${m.player === 1 ? 'B' : 'W'}[]`
    } else {
      const col = COORD[m.x]
      const row = COORD[m.y]
      sgf += `;${m.player === 1 ? 'B' : 'W'}[${col}${row}]`
    }
  }

  sgf += ')'
  return sgf
}

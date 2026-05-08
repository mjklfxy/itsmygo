import type { Move, GameRecord } from './types'

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

export function downloadSGF(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/x-go-sgf;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function saveRecord(record: GameRecord) {
  const records = loadRecords()
  records.unshift(record)
  if (records.length > 50) records.length = 50
  localStorage.setItem('go_records', JSON.stringify(records))
}

export function loadRecords(): GameRecord[] {
  try {
    return JSON.parse(localStorage.getItem('go_records') || '[]')
  } catch {
    return []
  }
}

export function deleteRecord(id: string) {
  const records = loadRecords().filter(r => r.id !== id)
  localStorage.setItem('go_records', JSON.stringify(records))
}

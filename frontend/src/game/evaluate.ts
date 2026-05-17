import type { Board } from './types'
import { getNeighbors } from './board'

/** KataGo-inspired ownership map evaluation */
export function evaluate(
  board: Board,
  captures: { black: number; white: number },
  komi: number = 7.5
): { black: number; white: number; blackTerritory: number; whiteTerritory: number; blackInfluence: number; whiteInfluence: number; winRate: number } {
  const size = board.length

  // ── 1. BFS influence: stones radiate through empty points ──
  const bInf = Array.from({ length: size }, () => Array(size).fill(0))
  const wInf = Array.from({ length: size }, () => Array(size).fill(0))

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] !== 1 && board[y][x] !== -1) continue
      const inf = board[y][x] === 1 ? bInf : wInf
      inf[y][x] += 30
      for (const [nx, ny] of getNeighbors(x, y, size)) {
        if (board[ny][nx] === 0) inf[ny][nx] += 15
      }
    }
  }

  function propagate(inf: number[][]) {
    const queue: [number, number][] = []
    const inQ = Array.from({ length: size }, () => Array(size).fill(false))
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        if (inf[y][x] > 0) { queue.push([x, y]); inQ[y][x] = true }
    let head = 0
    while (head < queue.length) {
      const [cx, cy] = queue[head++]
      inQ[cy][cx] = false
      const val = inf[cy][cx]
      if (val <= 4) continue
      const nv = val - Math.max(3, Math.floor(val * 0.33))
      for (const [nx, ny] of getNeighbors(cx, cy, size)) {
        if (board[ny][nx] !== 0) continue
        if (nv > inf[ny][nx]) {
          inf[ny][nx] = nv
          if (!inQ[ny][nx]) { queue.push([nx, ny]); inQ[ny][nx] = true }
        }
      }
    }
  }
  propagate(bInf)
  propagate(wInf)

  // ── 2. Ownership map: like KataGo, each point ∈ [-1, +1] ──
  let blackTerritory = 0
  let whiteTerritory = 0
  let blackInfluence = 0
  let whiteInfluence = 0

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] !== 0) continue
      const net = bInf[y][x] - wInf[y][x]
      const own = Math.tanh(net / 20)
      if (own >= 0) {
        blackTerritory += 1
        blackInfluence += own
      } else {
        whiteTerritory += 1
        whiteInfluence += -own
      }
    }
  }

  // ── 3. Score: ownership sum for all intersections ──
  let ownershipSum = 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] === 1) ownershipSum += 1
      else if (board[y][x] === -1) ownershipSum -= 1
      else ownershipSum += Math.tanh((bInf[y][x] - wInf[y][x]) / 20)
    }
  }

  const scoreDiff = ownershipSum + captures.black - captures.white - komi
  const black = Math.round((scoreDiff + size * size + 1) / 2)
  const white = size * size + 1 - black

  // ── 4. Win rate from score diff ──
  const winRate = 1 / (1 + Math.exp(-scoreDiff / 8))

  return {
    black, white,
    blackTerritory, whiteTerritory,
    blackInfluence: Math.round(blackInfluence),
    whiteInfluence: Math.round(whiteInfluence),
    winRate,
  }
}

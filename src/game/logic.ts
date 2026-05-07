import type { Board, Stone, Player } from './types'
import { analyzeOwnership } from './ownership'

function cloneBoard(board: Board): Board {
  return board.map(row => [...row])
}

function getNeighbors(x: number, y: number, size: number): [number, number][] {
  const result: [number, number][] = []
  if (x > 0) result.push([x - 1, y])
  if (x < size - 1) result.push([x + 1, y])
  if (y > 0) result.push([x, y - 1])
  if (y < size - 1) result.push([x, y + 1])
  return result
}

/** Find the connected group containing (x,y) and count its liberties */
export function findGroup(
  board: Board,
  x: number,
  y: number
): { stones: Set<string>; liberties: Set<string> } {
  const size = board.length
  const color = board[y][x]
  if (color === 0) return { stones: new Set(), liberties: new Set() }

  const stones = new Set<string>()
  const liberties = new Set<string>()
  const stack: [number, number][] = [[x, y]]

  while (stack.length > 0) {
    const [cx, cy] = stack.pop()!
    const key = `${cx},${cy}`
    if (stones.has(key)) continue
    if (board[cy][cx] !== color) continue

    stones.add(key)
    for (const [nx, ny] of getNeighbors(cx, cy, size)) {
      if (board[ny][nx] === 0) {
        liberties.add(`${nx},${ny}`)
      } else if (board[ny][nx] === color) {
        stack.push([nx, ny])
      }
    }
  }

  return { stones, liberties }
}

/** Try to place a stone. Returns null if illegal. */
export function placeStone(
  board: Board,
  x: number,
  y: number,
  player: Player,
  prevBoard: Board | null
): { board: Board; captured: number } | null {
  const size = board.length
  if (board[y][x] !== 0) return null // occupied

  const newBoard = cloneBoard(board)
  newBoard[y][x] = player as Stone

  // Check captures of opponent groups
  const opponent = -player as Stone
  let totalCaptured = 0

  for (const [nx, ny] of getNeighbors(x, y, size)) {
    if (newBoard[ny][nx] === opponent) {
      const group = findGroup(newBoard, nx, ny)
      if (group.liberties.size === 0) {
        totalCaptured += group.stones.size
        for (const key of group.stones) {
          const [sx, sy] = key.split(',').map(Number)
          newBoard[sy][sx] = 0
        }
      }
    }
  }

  // Check suicide: if own group has no liberties and didn't capture, it's illegal
  const ownGroup = findGroup(newBoard, x, y)
  if (ownGroup.liberties.size === 0 && totalCaptured === 0) {
    return null
  }

  // Ko check: new board must not equal the board before the previous move
  if (prevBoard) {
    const same = newBoard.every((row, j) =>
      row.every((cell, i) => cell === prevBoard[j][i])
    )
    if (same) return null // ko violation
  }

  return { board: newBoard, captured: totalCaptured }
}

/** Simple area scoring: count territory + prisoners + komi */
export function score(
  board: Board,
  captures: { black: number; white: number },
  komi: number = 7.5
): { black: number; white: number } {
  const size = board.length
  const visited = Array.from({ length: size }, () => Array(size).fill(false))
  let blackTerritory = 0
  let whiteTerritory = 0

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] !== 0 || visited[y][x]) continue

      // BFS to find empty region
      const region: [number, number][] = []
      const borders = new Set<number>()
      const queue: [number, number][] = [[x, y]]
      visited[y][x] = true

      while (queue.length > 0) {
        const [cx, cy] = queue.pop()!
        region.push([cx, cy])
        for (const [nx, ny] of getNeighbors(cx, cy, size)) {
          if (board[ny][nx] === 0 && !visited[ny][nx]) {
            visited[ny][nx] = true
            queue.push([nx, ny])
          } else if (board[ny][nx] !== 0) {
            borders.add(board[ny][nx])
          }
        }
      }

      if (borders.size === 1) {
        const owner = [...borders][0]
        if (owner === 1) blackTerritory += region.length
        else whiteTerritory += region.length
      }
    }
  }

  return {
    black: blackTerritory + captures.black,
    white: whiteTerritory + captures.white + komi,
  }
}

/** Detect territory ownership for 数子: uses AI ownership prediction */
export function detectTerritory(board: Board, captures: { black: number; white: number } = { black: 0, white: 0 }, komi: number = 7.5): Board {
  const { territory } = analyzeOwnership(board, captures, komi)
  return territory
}

/** Full ownership analysis result for detailed counting UI */
export function detectTerritoryDetailed(board: Board, captures: { black: number; white: number }, komi: number = 7.5) {
  return analyzeOwnership(board, captures, komi)
}

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
  //    Stones: definite ±1. Empty: sigmoid of net influence.
  let blackTerritory = 0   // sum of ownership for empty points owned by black
  let whiteTerritory = 0
  let blackInfluence = 0   // sum of ownership for empty points (contested)
  let whiteInfluence = 0

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] !== 0) continue
      const net = bInf[y][x] - wInf[y][x]
      const own = Math.tanh(net / 20)   // [-1, +1]
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
  //    scoreDiff = Σownership + captures_diff - komi
  //    where Σownership = stoneDiff + ΣemptyOwnership
  //    stoneDiff is already captured by stones having influence on themselves
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

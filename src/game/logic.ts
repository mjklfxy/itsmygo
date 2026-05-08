import type { Board, Stone, Player } from './types'
import { getNeighbors, cloneBoard } from './board'
import { analyzeOwnership } from './ownership'

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

/** Full ownership analysis result for detailed counting UI */
export function detectTerritoryDetailed(board: Board, captures: { black: number; white: number }, komi: number = 7.5) {
  return analyzeOwnership(board, captures, komi)
}

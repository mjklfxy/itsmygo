import type { Board } from './types'

/** Get orthogonal neighbors of (x, y) within a size×size board */
export function getNeighbors(x: number, y: number, size: number): [number, number][] {
  const r: [number, number][] = []
  if (x > 0) r.push([x - 1, y])
  if (x < size - 1) r.push([x + 1, y])
  if (y > 0) r.push([x, y - 1])
  if (y < size - 1) r.push([x, y + 1])
  return r
}

/** Deep-clone a board */
export function cloneBoard(board: Board): Board {
  return board.map(row => [...row])
}

/** Create an empty board of given size */
export function createEmptyBoard(size: number): Board {
  return Array.from({ length: size }, () => Array(size).fill(0))
}

import type { Board, Player, Stone } from './types'
import { placeStone, findGroup } from './logic'

function getNeighbors(x: number, y: number, size: number): [number, number][] {
  const r: [number, number][] = []
  if (x > 0) r.push([x - 1, y])
  if (x < size - 1) r.push([x + 1, y])
  if (y > 0) r.push([x, y - 1])
  if (y < size - 1) r.push([x, y + 1])
  return r
}

function countStones(board: Board): number {
  let n = 0
  for (const row of board) for (const c of row) if (c !== 0) n++
  return n
}

/** Check if (x,y) is a real eye for color on board */
function isEye(board: Board, x: number, y: number, color: number, size: number): boolean {
  if (board[y][x] !== 0) return false
  const neighbors = getNeighbors(x, y, size)
  if (!neighbors.every(([nx, ny]) => board[ny][nx] === color)) return false
  // Corner eye check: diagonal should also be friendly (or edge)
  const diags: [number, number][] = []
  if (x > 0 && y > 0) diags.push([x - 1, y - 1])
  if (x < size - 1 && y > 0) diags.push([x + 1, y - 1])
  if (x > 0 && y < size - 1) diags.push([x - 1, y + 1])
  if (x < size - 1 && y < size - 1) diags.push([x + 1, y + 1])
  // On edge: need all diags to be friendly. Interior: need most diags friendly.
  const onEdge = neighbors.length < 4
  const friendlyDiags = diags.filter(([dx, dy]) => board[dy][dx] === color).length
  if (onEdge) return friendlyDiags === diags.length
  return friendlyDiags >= diags.length - 1
}

/** Get positional value based on distance from edge and corners */
function positionalValue(x: number, y: number, size: number, moveNumber: number): number {
  const edgeDist = Math.min(x, y, size - 1 - x, size - 1 - y)
  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  let score = 0

  if (size >= 13) {
    // Opening: prefer star points and corners
    if (moveNumber < 10) {
      // Corner > side > center in opening
      if (edgeDist <= 2) score += 8 - edgeDist * 2
      else score += 2
      // Star point bonus
      const stars = size === 19 ? [[3,3],[9,3],[15,3],[3,9],[9,9],[15,9],[3,15],[9,15],[15,15]]
        : size === 13 ? [[3,3],[9,3],[6,6],[3,9],[9,9]] : []
      for (const [sx, sy] of stars) {
        if (x === sx && y === sy) { score += 4; break }
        if (Math.abs(x - sx) + Math.abs(y - sy) <= 2) { score += 2; break }
      }
    } else {
      // Mid/late game: prefer edge proximity for territory
      if (edgeDist === 0) score += 2
      else if (edgeDist === 1) score += 3
      else if (edgeDist === 2) score += 2
      else score += 1
    }
    // Avoid first/second line in opening
    if (moveNumber < 15 && edgeDist <= 1) score -= 2
  } else if (size === 9) {
    // 9x9: center is very important
    const distFromCenter = Math.abs(x - cx) + Math.abs(y - cy)
    score += Math.max(0, 4 - distFromCenter)
    if (moveNumber < 4 && edgeDist <= 1) score -= 3
  } else {
    // 13x13: balanced
    if (moveNumber < 6 && edgeDist <= 1) score -= 2
    if (edgeDist >= 2 && edgeDist <= 4) score += 2
  }

  return score
}

/** Evaluate shape: reward good shapes, punish bad ones */
function shapeValue(board: Board, x: number, y: number, player: Player, size: number): number {
  let score = 0
  const neighbors = getNeighbors(x, y, size)
  const friendlyNeighbors = neighbors.filter(([nx, ny]) => board[ny][nx] === player).length
  const opponent = -player as Stone
  const opponentNeighbors = neighbors.filter(([nx, ny]) => board[ny][nx] === opponent).length

  // Diagonal connections
  const diags: [number, number][] = []
  if (x > 0 && y > 0) diags.push([x - 1, y - 1])
  if (x < size - 1 && y > 0) diags.push([x + 1, y - 1])
  if (x > 0 && y < size - 1) diags.push([x - 1, y + 1])
  if (x < size - 1 && y < size - 1) diags.push([x + 1, y + 1])
  const friendlyDiags = diags.filter(([dx, dy]) => board[dy][dx] === player).length

  // Hane: diagonal friendly + adjacent opponent = strong shape
  if (friendlyDiags >= 1 && opponentNeighbors >= 1) score += 4

  // Knight's move connection (good shape)
  if (friendlyDiags >= 1 && friendlyNeighbors === 0) score += 3

  // Solid connection to friendly stones
  if (friendlyNeighbors >= 2) score += 3

  // Clamp: 3+ friendly neighbors is overconcentrated
  if (friendlyNeighbors >= 3 && opponentNeighbors === 0) score -= 4

  // Empty triangle detection (bad shape)
  if (friendlyNeighbors === 2) {
    // Check if the two friendly neighbors are adjacent to each other (forming triangle)
    const fnCoords = neighbors.filter(([nx, ny]) => board[ny][nx] === player)
    if (fnCoords.length === 2) {
      const [ax, ay] = fnCoords[0]
      const [bx, by] = fnCoords[1]
      if (Math.abs(ax - bx) + Math.abs(ay - by) === 2) score -= 6 // empty triangle
    }
  }

  // Don't play directly next to strong opponent groups on first/second line
  if (opponentNeighbors >= 2) {
    const edgeDist = Math.min(x, y, size - 1 - x, size - 1 - y)
    if (edgeDist <= 1) score -= 3
  }

  return score
}

function evaluateMove(
  board: Board,
  x: number,
  y: number,
  player: Player,
  prevBoard: Board | null,
  size: number,
  moveNumber: number
): number {
  // Can't play there
  if (board[y][x] !== 0) return -Infinity

  // Don't fill own eye
  if (isEye(board, x, y, player, size)) return -Infinity

  // Check legality
  const result = placeStone(board, x, y, player, prevBoard)
  if (!result) return -Infinity

  let score = 0
  const opponent = -player as Stone

  // ── Tactical: Captures ──
  if (result.captured > 0) {
    score += result.captured * 40
    // Extra bonus for capturing last liberty (killing a group)
    score += 20
  }

  // ── Tactical: Save own groups in atari ──
  for (const [nx, ny] of getNeighbors(x, y, size)) {
    if (board[ny][nx] === player) {
      const oldGroup = findGroup(board, nx, ny)
      if (oldGroup.liberties.size === 1) {
        // This group was in atari, we're connecting to it
        const newGroup = findGroup(result.board, x, y)
        score += (newGroup.liberties.size) * 12
      } else if (oldGroup.liberties.size === 2) {
        // Group in danger, connecting helps
        score += 8
      }
    }
  }

  // ── Tactical: Put opponent groups in atari ──
  for (const [nx, ny] of getNeighbors(x, y, size)) {
    if (result.board[ny][nx] === opponent) {
      const group = findGroup(result.board, nx, ny)
      if (group.liberties.size === 1) score += 30 // direct atari
      else if (group.liberties.size === 2) score += 12 // threaten
      else if (group.liberties.size === 3) score += 3
    }
  }

  // ── Tactical: Prevent self-atari ──
  const ownGroup = findGroup(result.board, x, y)
  if (ownGroup.liberties.size <= 1) {
    score -= 50 // self-atari is terrible (unless it captures)
  } else if (ownGroup.liberties.size === 2) {
    score -= 10 // risky, avoid unless necessary
  } else {
    score += ownGroup.liberties.size * 2
  }

  // ── Tactical: Attack opponent groups with few liberties ──
  const checkedOppGroups = new Set<string>()
  for (const [nx, ny] of getNeighbors(x, y, size)) {
    if (board[ny][nx] === opponent) {
      const key = `${nx},${ny}`
      if (checkedOppGroups.has(key)) continue
      const group = findGroup(board, nx, ny)
      for (const k of group.stones) checkedOppGroups.add(k)
      if (group.liberties.size <= 3) {
        // Reducing liberties of weak opponent group
        score += (4 - group.liberties.size) * 5
      }
    }
  }

  // ── Strategic: Connectivity ──
  const nbs = getNeighbors(x, y, size)
  const friendlyCount = nbs.filter(([nx, ny]) => board[ny][nx] === player).length
  score += friendlyCount * 5

  // ── Strategic: Shape ──
  score += shapeValue(board, x, y, player, size)

  // ── Strategic: Position ──
  score += positionalValue(x, y, size, moveNumber)

  // ── Strategic: Reduce opponent liberties ──
  for (const [nx, ny] of nbs) {
    if (board[ny][nx] === opponent) score += 2
  }

  return score
}

export function selectMove(
  board: Board,
  player: Player,
  prevBoard: Board | null
): { x: number; y: number } | null {
  const size = board.length
  const moveNumber = countStones(board)
  const candidates: { x: number; y: number; score: number }[] = []

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] !== 0) continue

      // Skip isolated empty points when there's already action on the board
      const hasNeighbor = getNeighbors(x, y, size).some(([nx, ny]) => board[ny][nx] !== 0)
      // Also check diagonals for early game
      let hasDiag = false
      if (x > 0 && y > 0 && board[y-1][x-1] !== 0) hasDiag = true
      if (x < size-1 && y > 0 && board[y-1][x+1] !== 0) hasDiag = true
      if (x > 0 && y < size-1 && board[y+1][x-1] !== 0) hasDiag = true
      if (x < size-1 && y < size-1 && board[y+1][x+1] !== 0) hasDiag = true

      if (!hasNeighbor && !hasDiag && moveNumber > 0) continue

      const s = evaluateMove(board, x, y, player, prevBoard, size, moveNumber)
      if (s > -Infinity) candidates.push({ x, y, score: s })
    }
  }

  if (candidates.length === 0) return null

  candidates.sort((a, b) => b.score - a.score)
  const topScore = candidates[0].score

  // Tight randomness: only top 3 within 5 points of best
  const threshold = Math.min(5, Math.max(1, topScore * 0.1))
  const topN = candidates.filter(c => c.score >= topScore - threshold).slice(0, 4)

  return topN[Math.floor(Math.random() * topN.length)]
}

/**
 * ownership.ts — AI-based automatic scoring module
 *
 * Predicts per-point ownership [-1, +1] without a neural network,
 * using heuristic group vitality analysis + influence propagation.
 * Handles dead stones, unsettled territory, seki, and partial games.
 */

import type { Board, Stone } from './types'
import { getNeighbors } from './board'
import { findGroup } from './logic'

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface GroupVitality {
  color: Stone
  stones: Set<string>
  liberties: number
  realEyes: number
  potentialEyes: number
  health: number      // [0, 1] — 0 = dead, 1 = alive
  status: 'alive' | 'dying' | 'dead' | 'seki'
}

export interface OwnershipResult {
  /** Per-point ownership [-1, +1]. +1 = black, -1 = white */
  ownership: number[][]
  /** Territory markers: 1=black, -1=white, 0=contested */
  territory: Board
  /** Dead stones identified by the analyzer */
  deadStones: { x: number; y: number; color: Stone }[]
  /** Final scores */
  blackScore: number
  whiteScore: number
}

// ────────────────────────────────────────────
// Phase 1: Group Vitality Analysis
// ────────────────────────────────────────────

/**
 * Count real eyes for a group.
 * A real eye = empty point where ALL neighbors belong to the group's color.
 */
function countRealEyes(board: Board, stones: Set<string>, color: number, size: number): number {
  const eyeCandidates = new Set<string>()

  for (const k of stones) {
    const [x, y] = k.split(',').map(Number)
    for (const [nx, ny] of getNeighbors(x, y, size)) {
      const nk = `${nx},${ny}`
      if (board[ny][nx] === 0 && !stones.has(nk)) {
        eyeCandidates.add(nk)
      }
    }
  }

  let eyes = 0
  for (const ek of eyeCandidates) {
    const [ex, ey] = ek.split(',').map(Number)
    const neighbors = getNeighbors(ex, ey, size)
    const isRealEye = neighbors.every(([ax, ay]) =>
      board[ay][ax] === color || stones.has(`${ax},${ay}`)
    )
    if (isRealEye) eyes++
  }
  return eyes
}

/**
 * Count potential eyes: empty points that are PARTIALLY enclosed by the group.
 * These could become real eyes if the group strengthens.
 */
function countPotentialEyes(board: Board, stones: Set<string>, color: number, size: number): number {
  const candidates = new Set<string>()
  for (const k of stones) {
    const [x, y] = k.split(',').map(Number)
    for (const [nx, ny] of getNeighbors(x, y, size)) {
      if (board[ny][nx] === 0) candidates.add(`${nx},${ny}`)
    }
  }

  let potential = 0
  for (const ck of candidates) {
    const [cx, cy] = ck.split(',').map(Number)
    const neighbors = getNeighbors(cx, cy, size)
    const ownCount = neighbors.filter(
      ([ax, ay]) => board[ay][ax] === color || stones.has(`${ax},${ay}`)
    ).length
    // At least 75% enclosed by own color = potential eye
    if (ownCount >= neighbors.length * 0.75 && ownCount < neighbors.length) {
      potential++
    }
  }
  return potential
}

/**
 * Compute health score [0, 1] for a group based on its vitality indicators.
 */
function computeHealth(liberties: number, realEyes: number, potentialEyes: number): number {
  if (realEyes >= 2) return 1.0       // two eyes = alive
  if (realEyes === 1) {
    // One eye: health depends on liberties
    if (liberties >= 4) return 0.8
    if (liberties >= 3) return 0.6
    if (liberties >= 2) return 0.4
    return 0.15                        // one eye + 1 liberty = almost dead
  }
  // No real eyes
  if (potentialEyes >= 2 && liberties >= 4) return 0.6
  if (potentialEyes >= 1 && liberties >= 3) return 0.4
  if (liberties >= 5) return 0.35
  if (liberties >= 3) return 0.15
  if (liberties >= 2) return 0.05
  return 0                             // atari with no eyes = dead
}

/**
 * Determine vitality status from health score.
 */
function getStatus(health: number): GroupVitality['status'] {
  if (health >= 0.7) return 'alive'
  if (health >= 0.15) return 'dying'
  return 'dead'
}

/**
 * Analyze all groups on the board and return their vitality.
 */
function analyzeVitality(board: Board): Map<string, GroupVitality> {
  const size = board.length
  const vitalityMap = new Map<string, GroupVitality>()
  const processed = Array.from({ length: size }, () => Array(size).fill(false))

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] === 0 || processed[y][x]) continue

      const group = findGroup(board, x, y)
      const color = board[y][x] as Stone
      const realEyes = countRealEyes(board, group.stones, color, size)
      const potentialEyes = countPotentialEyes(board, group.stones, color, size)
      const health = computeHealth(group.liberties.size, realEyes, potentialEyes)
      const status = getStatus(health)

      const vitality: GroupVitality = {
        color,
        stones: group.stones,
        liberties: group.liberties.size,
        realEyes,
        potentialEyes,
        health,
        status,
      }

      for (const k of group.stones) {
        vitalityMap.set(k, vitality)
        const [sx, sy] = k.split(',').map(Number)
        processed[sy][sx] = true
      }
    }
  }

  return vitalityMap
}

// ────────────────────────────────────────────
// Phase 2: Seki Detection
// ────────────────────────────────────────────

/**
 * Detect seki (mutual life) situations.
 * Seki: adjacent groups of different colors that share liberties,
 * neither can play without being captured, both are "alive" together.
 *
 * Heuristic: if a region has both colors bordering it, and all bordering
 * groups have low health (< 0.7) but aren't dead (health > 0), it's seki.
 */
function detectSeki(
  board: Board,
  vitality: Map<string, GroupVitality>,
  size: number
): Set<string> {
  const sekiStones = new Set<string>()
  const visited = Array.from({ length: size }, () => Array(size).fill(false))

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] !== 0 || visited[y][x]) continue

      // BFS to find empty region
      const region: [number, number][] = []
      const borderGroups = new Set<GroupVitality>()
      const q: [number, number][] = [[x, y]]
      visited[y][x] = true

      while (q.length > 0) {
        const [cx, cy] = q.pop()!
        region.push([cx, cy])
        for (const [nx, ny] of getNeighbors(cx, cy, size)) {
          if (board[ny][nx] === 0 && !visited[ny][nx]) {
            visited[ny][nx] = true
            q.push([nx, ny])
          } else if (board[ny][nx] !== 0) {
            const v = vitality.get(`${nx},${ny}`)
            if (v) borderGroups.add(v)
          }
        }
      }

      // Check if this region is a seki zone:
      // - Has both colors bordering
      // - All bordering groups are dying (0.15 < health < 0.7)
      // - Region is small (≤ 8 points — large regions are contested, not seki)
      const colors = new Set([...borderGroups].map(g => g.color))
      if (colors.size !== 2 || region.length > 8) continue

      const allDying = [...borderGroups].every(g => g.health > 0 && g.health < 0.7)
      if (!allDying) continue

      // Mark bordering groups as seki
      for (const g of borderGroups) {
        for (const k of g.stones) sekiStones.add(k)
      }
    }
  }

  return sekiStones
}

// ────────────────────────────────────────────
// Phase 3: Influence Propagation
// ────────────────────────────────────────────

/**
 * Build influence maps from stones, weighted by group health.
 * Dead stones contribute 0 influence. Alive stones contribute full.
 */
function buildInfluence(
  board: Board,
  vitality: Map<string, GroupVitality>,
  sekiStones: Set<string>,
  size: number
): { bInf: number[][]; wInf: number[][] } {
  const bInf = Array.from({ length: size }, () => Array(size).fill(0))
  const wInf = Array.from({ length: size }, () => Array(size).fill(0))

  // Seed influence based on health
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] === 0) continue
      const v = vitality.get(`${x},${y}`)
      if (!v) continue

      // Seki stones: neutral, minimal influence
      if (sekiStones.has(`${x},${y}`)) continue

      // Dead stones: zero influence (they'll be removed)
      if (v.status === 'dead') continue

      // Seed strength proportional to health
      const seed = v.health * 40
      const inf = board[y][x] === 1 ? bInf : wInf
      inf[y][x] += seed

      // Spread to adjacent empty points
      for (const [nx, ny] of getNeighbors(x, y, size)) {
        if (board[ny][nx] === 0) inf[ny][nx] += seed * 0.5
      }
    }
  }

  // BFS propagation through empty points
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
  return { bInf, wInf }
}

// ────────────────────────────────────────────
// Phase 4: Territory Estimation
// ────────────────────────────────────────────

/**
 * Estimate territory from definite surrounded regions.
 * Only counts empty regions bordered exclusively by one ALIVE color.
 */
function estimateDefiniteTerritory(
  board: Board,
  vitality: Map<string, GroupVitality>,
  size: number
): { black: number; white: number; map: Board } {
  const map: Board = Array.from({ length: size }, () => Array(size).fill(0))
  const visited = Array.from({ length: size }, () => Array(size).fill(false))
  let black = 0, white = 0

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] !== 0 || visited[y][x]) continue
      const region: [number, number][] = []
      const borders = new Set<number>()
      const q: [number, number][] = [[x, y]]
      visited[y][x] = true

      while (q.length > 0) {
        const [cx, cy] = q.pop()!
        region.push([cx, cy])
        for (const [nx, ny] of getNeighbors(cx, cy, size)) {
          if (board[ny][nx] === 0 && !visited[ny][nx]) {
            visited[ny][nx] = true
            q.push([nx, ny])
          } else if (board[ny][nx] !== 0) {
            const v = vitality.get(`${nx},${ny}`)
            // Only count alive stones as territory borders
            if (v && v.status !== 'dead') {
              borders.add(board[ny][nx])
            }
          }
        }
      }

      if (borders.size === 1) {
        const owner = [...borders][0]
        for (const [rx, ry] of region) map[ry][rx] = owner as Stone
        if (owner === 1) black += region.length
        else white += region.length
      }
    }
  }

  return { black, white, map }
}

// ────────────────────────────────────────────
// Phase 5: Edge and Corner Corrections
// ────────────────────────────────────────────

/**
 * Apply edge/corner corrections to ownership.
 * - Corner influence is stronger (stones project more influence into corners)
 * - Weak groups near edges are more likely dead (harder to make eyes)
 * - Strong groups near edges get territory bonus (easier to secure)
 */
function applyEdgeCorrections(
  ownership: number[][],
  board: Board,
  vitality: Map<string, GroupVitality>,
  size: number
): void {
  // For each dead stone near the edge, reinforce opponent ownership
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = vitality.get(`${x},${y}`)
      if (!v || v.status !== 'dead') continue

      const distToEdge = Math.min(x, y, size - 1 - x, size - 1 - y)
      // Dead stones near the edge are very likely truly dead
      if (distToEdge <= 2) {
        // Push ownership toward opponent in surrounding area
        const push = v.color === 1 ? -0.3 : 0.3
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nx = x + dx, ny = y + dy
            if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[ny][nx] === 0) {
              const dist = Math.abs(dx) + Math.abs(dy)
              ownership[ny][nx] += push / (1 + dist * 0.5)
              ownership[ny][nx] = Math.max(-1, Math.min(1, ownership[ny][nx]))
            }
          }
        }
      }
    }
  }
}

// ────────────────────────────────────────────
// Main Entry Point
// ────────────────────────────────────────────

/**
 * Full ownership analysis pipeline.
 * Returns per-point ownership, territory map, dead stones, and scores.
 */
export function analyzeOwnership(
  board: Board,
  captures: { black: number; white: number },
  komi: number = 7.5
): OwnershipResult {
  const size = board.length

  // Phase 1: Analyze all groups
  const vitality = analyzeVitality(board)

  // Phase 2: Detect seki
  const sekiStones = detectSeki(board, vitality, size)

  // Update seki group status
  for (const k of sekiStones) {
    const v = vitality.get(k)
    if (v) {
      const sekiVitality = { ...v, status: 'seki' as const }
      for (const sk of v.stones) vitality.set(sk, sekiVitality)
    }
  }

  // Phase 3: Build influence maps
  const { bInf, wInf } = buildInfluence(board, vitality, sekiStones, size)

  // Phase 4: Compute ownership map
  const ownership = Array.from({ length: size }, () => Array(size).fill(0))

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] !== 0) {
        const v = vitality.get(`${x},${y}`)
        if (!v) {
          ownership[y][x] = board[y][x]
        } else if (v.status === 'dead') {
          // Dead stone: ownership goes to opponent
          ownership[y][x] = -v.color
        } else if (v.status === 'seki') {
          // Seki: neutral, slight home-field advantage
          ownership[y][x] = v.color * 0.2
        } else if (v.status === 'dying') {
          // Dying: partial ownership, leaning opponent
          ownership[y][x] = v.color * v.health * 0.5
        } else {
          // Alive: full ownership
          ownership[y][x] = v.color
        }
      } else {
        // Empty point: estimate from influence difference
        const net = bInf[y][x] - wInf[y][x]
        ownership[y][x] = Math.tanh(net / 20)
      }
    }
  }

  // Phase 5: Edge corrections
  applyEdgeCorrections(ownership, board, vitality, size)

  // Phase 6: Compute definite territory (for territory map)
  const territoryResult = estimateDefiniteTerritory(board, vitality, size)

  // Also assign dead stones' points to the capturing color in territory map
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = vitality.get(`${x},${y}`)
      if (v && v.status === 'dead') {
        territoryResult.map[y][x] = -v.color as Stone
        if (v.color === 1) territoryResult.white++
        else territoryResult.black++
      }
    }
  }

  // Collect dead stones
  const deadStones: OwnershipResult['deadStones'] = []
  const seen = new Set<string>()
  for (const [k, v] of vitality) {
    if (v.status === 'dead' && !seen.has(k)) {
      const [x, y] = k.split(',').map(Number)
      deadStones.push({ x, y, color: v.color })
      for (const sk of v.stones) seen.add(sk)
    }
  }

  // Compute scores
  let ownershipSum = 0
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      ownershipSum += ownership[y][x]

  const scoreDiff = ownershipSum + captures.black - captures.white - komi
  const blackScore = Math.round((scoreDiff + size * size + 1) / 2)
  const whiteScore = size * size + 1 - blackScore

  return {
    ownership,
    territory: territoryResult.map,
    deadStones,
    blackScore,
    whiteScore,
  }
}

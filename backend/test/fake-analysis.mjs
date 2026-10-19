/**
 * Mock KataGo analysis engine used to verify the backend integration without the
 * real binary. Speaks the same line-delimited JSON protocol.
 *
 * Deliberately exercises the parts of the protocol that are easy to get wrong:
 *  - an intermediate `isDuringSearch: true` object that must be ignored
 *  - a response keyed by a request id that does not exist (must be dropped)
 *  - rootInfo reported from the side-to-move, which the client must normalise
 */
import { createInterface } from 'node:readline'

const rl = createInterface({ input: process.stdin, terminal: false })

rl.on('line', (line) => {
  let query
  try {
    query = JSON.parse(line)
  } catch {
    return
  }

  const moves = Array.isArray(query.moves) ? query.moves : []
  const blackMoves = moves.filter((m) => m[0] === 'B').length
  const whiteMoves = moves.filter((m) => m[0] === 'W').length
  const sideToMove = blackMoves > whiteMoves ? 'W' : 'B'

  // Deterministic, obviously synthetic values so tests can assert on them.
  const winrate = 0.25
  const scoreLead = -12.5

  // Noise the client must ignore.
  process.stdout.write(
    JSON.stringify({ id: query.id, isDuringSearch: true, rootInfo: { winrate: 0.99 } }) + '\n',
  )
  process.stdout.write(
    JSON.stringify({ id: 'nonexistent-id', rootInfo: { winrate: 0.01 } }) + '\n',
  )

  const rootInfo = {
    winrate,
    scoreLead,
    scoreStdev: 3.25,
    visits: 400,
    currentPlayer: sideToMove,
    rawWinrate: winrate,
    rawScoreLead: scoreLead,
  }

  const moveInfos = [
    { move: 'D4', winrate: 0.24, scoreLead: -13, visits: 180, order: 0, pv: ['D4'] },
    { move: 'Q16', winrate: 0.26, scoreLead: -11, visits: 120, order: 1, pv: ['Q16'] },
  ]

  process.stdout.write(JSON.stringify({ id: query.id, rootInfo, moveInfos }) + '\n')
})

rl.on('close', () => process.exit(0))

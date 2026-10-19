/**
 * Integration test for the KataGo analysis client.
 *
 * Runs against `fake-analysis.mjs` so the protocol handling can be verified without
 * the real KataGo binary and neural net. Covers:
 *   - line-delimited JSON framing
 *   - ignoring `isDuringSearch` intermediate reports
 *   - ignoring responses whose id does not match a pending query
 *   - normalising winrate/scoreLead from the side-to-move to black's perspective
 *   - concurrent queries not mixing responses
 */
import { describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { AnalysisEngine } from '../src/analysis'

// `new URL(...).pathname` yields a leading slash on Windows ("/E:/..."), which
// node cannot open. fileURLToPath handles the drive letter correctly.
const FAKE_ENGINE = fileURLToPath(new URL('./fake-analysis.mjs', import.meta.url))

/** Spawn node directly on the fake engine; no wrapper script needed. */
function startFake(engine: AnalysisEngine): Promise<void> {
  return engine.start({
    katagoPath: 'node',
    modelPath: 'unused',
    configPath: 'unused',
    argv: [process.execPath, FAKE_ENGINE],
  })
}

describe('AnalysisEngine', () => {
  test('parses a real analysis response and normalises to black', async () => {
    const engine = new AnalysisEngine()
    await startFake(engine)

    try {
      // Black has played three times... actually B, W, B: black has one more move,
      // so white is to move. The fake reports winrate 0.25 and scoreLead -12.5 for
      // the side to move, i.e. black is ahead.
      const result = await engine.analyze({
        moves: [
          ['B', 'D4'],
          ['W', 'Q16'],
          ['B', 'D16'],
        ],
        komi: 7.5,
        boardSize: 19,
      })

      expect(result.currentPlayer).toBe('W')
      expect(result.blackWinRate).toBeCloseTo(0.75, 5)
      expect(result.blackLead).toBeCloseTo(12.5, 5)
      expect(result.blackLeadStdev).toBe(3.25)
      expect(result.visits).toBe(400)
      expect(result.moves).toHaveLength(2)
      // Moves keep engine order and are also normalised.
      expect(result.moves[0].move).toBe('D4')
      expect(result.moves[0].winRate).toBeCloseTo(0.76, 5)
      expect(result.moves[1].order).toBe(1)
    } finally {
      await engine.stop()
    }
  })

  test('normalises correctly when black is to move', async () => {
    const engine = new AnalysisEngine()
    await startFake(engine)

    try {
      const result = await engine.analyze({
        moves: [
          ['B', 'D4'],
          ['W', 'Q16'],
        ],
        komi: 7.5,
        boardSize: 19,
      })
      expect(result.currentPlayer).toBe('B')
      expect(result.blackWinRate).toBeCloseTo(0.25, 5)
      expect(result.blackLead).toBeCloseTo(-12.5, 5)
    } finally {
      await engine.stop()
    }
  })

  test('handles concurrent queries without mixing responses', async () => {
    const engine = new AnalysisEngine()
    await startFake(engine)

    try {
      const [a, b] = await Promise.all([
        engine.analyze({ moves: [['B', 'D4']], komi: 7.5, boardSize: 9 }),
        engine.analyze({ moves: [['B', 'D4'], ['W', 'E5']], komi: 7.5, boardSize: 9 }),
      ])
      expect(a.currentPlayer).toBe('W')
      expect(b.currentPlayer).toBe('B')
    } finally {
      await engine.stop()
    }
  })

  test('rejects when not running', async () => {
    const engine = new AnalysisEngine()
    expect(engine.isRunning()).toBe(false)
    await expect(
      engine.analyze({ moves: [], komi: 7.5, boardSize: 9 }),
    ).rejects.toThrow('not running')
  })
})

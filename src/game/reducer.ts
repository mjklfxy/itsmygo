import type { GameState, Board, Player, Move } from './types'
import { createEmptyBoard } from './types'
import { placeStone, score, detectTerritory, detectTerritoryDetailed } from './logic'

export type GameAction =
  | { type: 'PLACE_STONE'; x: number; y: number }
  | { type: 'PASS' }
  | { type: 'RESIGN' }
  | { type: 'UNDO' }
  | { type: 'RESET'; size: number; komi?: number; aiMode?: 'none' | 'black' | 'white' }
  | { type: 'ENTER_REVIEW' }
  | { type: 'EXIT_REVIEW' }
  | { type: 'REVIEW_PREV' }
  | { type: 'REVIEW_NEXT' }
  | { type: 'ENTER_TRY' }
  | { type: 'EXIT_TRY' }
  | { type: 'REQUEST_COUNT' }
  | { type: 'ACCEPT_COUNT' }
  | { type: 'REJECT_COUNT' }
  | { type: 'CANCEL_COUNT' }

export function createInitialState(size: number, komi: number = 7.5, aiMode: 'none' | 'black' | 'white' = 'none'): GameState {
  return {
    size,
    board: createEmptyBoard(size),
    currentPlayer: 1,
    history: [],
    captures: { black: 0, white: 0 },
    consecutivePasses: 0,
    gameOver: false,
    winner: null,
    lastMove: null,
    moves: [],
    mode: 'play',
    reviewIndex: -1,
    savedBoard: null,
    savedPlayer: 1,
    savedHistory: [],
    savedReviewIndex: -1,
    countingMode: 'none',
    countingTerritory: null,
    countingRequester: null,
    countingDeadStones: [],
    countingBlackScore: 0,
    countingWhiteScore: 0,
    komi,
    aiMode,
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PLACE_STONE': {
      if (state.gameOver && state.mode === 'play') return state
      if (state.mode === 'review') return state
      if (state.countingMode !== 'none') return state

      const prevBoard = state.history.length >= 1 ? state.history[state.history.length - 1] : null
      const result = placeStone(state.board, action.x, action.y, state.currentPlayer, prevBoard)
      if (!result) return state

      // Try mode: just update board, no captures/moves tracking
      if (state.mode === 'try') {
        return {
          ...state,
          board: result.board,
          currentPlayer: (-state.currentPlayer) as Player,
          history: [...state.history, state.board],
          lastMove: [action.x, action.y],
        }
      }

      const newCaptures = { ...state.captures }
      if (state.currentPlayer === 1) newCaptures.black += result.captured
      else newCaptures.white += result.captured

      const move: Move = { x: action.x, y: action.y, player: state.currentPlayer }

      return {
        ...state,
        board: result.board,
        currentPlayer: (-state.currentPlayer) as Player,
        history: [...state.history, state.board],
        captures: newCaptures,
        consecutivePasses: 0,
        lastMove: [action.x, action.y],
        moves: [...state.moves, move],
      }
    }

    case 'PASS': {
      if (state.gameOver || state.mode !== 'play' || state.countingMode !== 'none') return state
      const move: Move = { x: -1, y: -1, player: state.currentPlayer, pass: true }
      const newPasses = state.consecutivePasses + 1
      if (newPasses >= 2) {
        const scores = score(state.board, state.captures, state.komi)
        return {
          ...state,
          consecutivePasses: newPasses,
          gameOver: true,
          winner: scores.black > scores.white ? 1 : scores.white > scores.black ? -1 : null,
          history: [...state.history, state.board],
          moves: [...state.moves, move],
        }
      }
      return {
        ...state,
        currentPlayer: (-state.currentPlayer) as Player,
        consecutivePasses: newPasses,
        history: [...state.history, state.board],
        lastMove: null,
        moves: [...state.moves, move],
      }
    }

    case 'RESIGN': {
      if (state.gameOver || state.mode !== 'play') return state
      return {
        ...state,
        gameOver: true,
        winner: (-state.currentPlayer) as Player,
        history: [...state.history, state.board],
      }
    }

    case 'UNDO': {
      if (state.mode === 'review') return state
      if (state.history.length === 0) return state
      return {
        ...state,
        board: state.history[state.history.length - 1],
        currentPlayer: (-state.currentPlayer) as Player,
        history: state.history.slice(0, -1),
        moves: state.mode === 'play' ? state.moves.slice(0, -1) : state.moves,
        consecutivePasses: 0,
        gameOver: false,
        winner: null,
        lastMove: null,
      }
    }

    case 'RESET':
      return createInitialState(action.size, action.komi, action.aiMode)

    // ── Review ──
    case 'ENTER_REVIEW': {
      if (state.moves.length === 0) return state
      return {
        ...state,
        mode: 'review',
        reviewIndex: state.history.length - 1,
        gameOver: false,
        winner: null,
      }
    }

    case 'EXIT_REVIEW': {
      const lastBoard = state.history[state.history.length - 1]
      return {
        ...state,
        mode: 'play',
        board: lastBoard,
        currentPlayer: state.moves.length === 0 ? 1
          : state.moves[state.moves.length - 1].pass
            ? state.moves[state.moves.length - 1].player
            : (-state.moves[state.moves.length - 1].player) as Player,
        reviewIndex: -1,
      }
    }

    case 'REVIEW_PREV': {
      if (state.mode !== 'review') return state
      const idx = Math.max(0, state.reviewIndex - 1)
      return {
        ...state,
        board: state.history[idx],
        reviewIndex: idx,
        lastMove: idx > 0 && idx - 1 < state.moves.length
          ? (state.moves[idx - 1].pass ? null : [state.moves[idx - 1].x, state.moves[idx - 1].y] as [number, number])
          : null,
      }
    }

    case 'REVIEW_NEXT': {
      if (state.mode !== 'review') return state
      const idx = Math.min(state.history.length - 1, state.reviewIndex + 1)
      return {
        ...state,
        board: state.history[idx],
        reviewIndex: idx,
        lastMove: idx > 0 && idx - 1 < state.moves.length
          ? (state.moves[idx - 1].pass ? null : [state.moves[idx - 1].x, state.moves[idx - 1].y] as [number, number])
          : null,
      }
    }

    // ── Try: snapshot full state, enter free placement ──
    case 'ENTER_TRY': {
      return {
        ...state,
        mode: 'try',
        savedBoard: state.board,
        savedPlayer: state.currentPlayer,
        savedHistory: state.history,
        savedReviewIndex: state.reviewIndex,
        history: [],
        gameOver: false,
        winner: null,
      }
    }

    // ── Exit try: restore full snapshot, return to review ──
    case 'EXIT_TRY': {
      const { savedBoard, savedPlayer, savedHistory, savedReviewIndex, ...rest } = state
      return {
        ...rest,
        mode: 'review',
        board: savedBoard!,
        currentPlayer: savedPlayer,
        history: savedHistory!,
        reviewIndex: savedReviewIndex!,
      }
    }

    // ── Counting (数子) ──
    case 'REQUEST_COUNT': {
      if (state.gameOver || state.mode !== 'play') return state
      if (state.moves.length < 2) return state
      const result = detectTerritoryDetailed(state.board, state.captures, state.komi)
      return {
        ...state,
        countingMode: 'requested',
        countingTerritory: result.territory,
        countingRequester: state.currentPlayer,
        countingDeadStones: result.deadStones,
        countingBlackScore: result.blackScore,
        countingWhiteScore: result.whiteScore,
      }
    }

    case 'ACCEPT_COUNT': {
      if (state.countingMode !== 'requested' || !state.countingTerritory) return state
      const b = state.countingBlackScore
      const w = state.countingWhiteScore
      return {
        ...state,
        gameOver: true,
        winner: b > w ? 1 : w > b ? -1 : null,
        countingMode: 'none',
        countingTerritory: null,
        countingRequester: null,
        countingDeadStones: [],
        countingBlackScore: 0,
        countingWhiteScore: 0,
        history: [...state.history, state.board],
      }
    }

    case 'REJECT_COUNT': {
      if (state.countingMode !== 'requested') return state
      return {
        ...state,
        countingMode: 'none',
        countingTerritory: null,
        countingRequester: null,
        countingDeadStones: [],
        countingBlackScore: 0,
        countingWhiteScore: 0,
      }
    }

    case 'CANCEL_COUNT': {
      if (state.countingMode !== 'requested') return state
      return {
        ...state,
        countingMode: 'none',
        countingTerritory: null,
        countingRequester: null,
        countingDeadStones: [],
        countingBlackScore: 0,
        countingWhiteScore: 0,
      }
    }

    default:
      return state
  }
}

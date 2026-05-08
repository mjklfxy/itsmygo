import type { GameState, Move, Player } from './types'
import { createEmptyBoard } from './board'
import { placeStone } from './logic'
import * as play from './modes/playHandler'
import * as review from './modes/reviewHandler'
import * as tryMode from './modes/tryHandler'

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
  | { type: 'LOAD_RECORD'; record: import('./types').GameRecord }

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
    savedMode: 'play',
    savedGameOver: false,
    savedWinner: null,
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

function replayMoves(state: GameState, moves: Move[]): GameState {
  let s = state
  for (const move of moves) {
    if (move.pass) {
      s = {
        ...s,
        consecutivePasses: s.consecutivePasses + 1,
        currentPlayer: (-s.currentPlayer) as Player,
        moves: [...s.moves, move],
        history: [...s.history, s.board],
      }
    } else {
      const prevBoard = s.history.length > 0 ? s.history[s.history.length - 1] : null
      const result = placeStone(s.board, move.x, move.y, move.player, prevBoard)
      if (!result) continue
      s = {
        ...s,
        board: result.board,
        captures: {
          black: s.captures.black + (move.player === 1 ? result.captured : 0),
          white: s.captures.white + (move.player === -1 ? result.captured : 0),
        },
        currentPlayer: (-s.currentPlayer) as Player,
        lastMove: [move.x, move.y] as [number, number],
        consecutivePasses: 0,
        moves: [...s.moves, move],
        history: [...s.history, s.board],
      }
    }
  }
  return {
    ...s,
    mode: 'review',
    reviewIndex: s.history.length - 1,
  }
}

function getModeHandler(mode: GameState['mode']) {
  switch (mode) {
    case 'play': return play
    case 'review': return review
    case 'try': return tryMode
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'PLACE_STONE':
      if (state.mode === 'review') return state
      return getModeHandler(state.mode).handlePlaceStone(state, action.x, action.y)
    case 'UNDO':
      return getModeHandler(state.mode).handleUndo(state)
    case 'PASS':
      return play.handlePass(state)
    case 'RESIGN':
      return play.handleResign(state)
    case 'ENTER_REVIEW':
      return review.handleEnterReview(state)
    case 'EXIT_REVIEW':
      return review.handleExitReview(state)
    case 'REVIEW_PREV':
      return review.handleReviewPrev(state)
    case 'REVIEW_NEXT':
      return review.handleReviewNext(state)
    case 'ENTER_TRY':
      return tryMode.handleEnterTry(state)
    case 'EXIT_TRY':
      return tryMode.handleExitTry(state)
    case 'REQUEST_COUNT':
      return play.handleRequestCount(state)
    case 'ACCEPT_COUNT':
      return play.handleAcceptCount(state)
    case 'REJECT_COUNT':
      return play.handleRejectCount(state)
    case 'CANCEL_COUNT':
      return play.handleCancelCount(state)
    case 'RESET':
      return createInitialState(action.size, action.komi, action.aiMode)
    case 'LOAD_RECORD': {
      const { record } = action
      const initialState = createInitialState(record.size, record.komi ?? 7.5, 'none')
      return replayMoves(initialState, record.moves)
    }
    default:
      return state
  }
}

import type { GameState, Player } from '../types'
import { placeStone } from '../logic'

export function handlePlaceStone(state: GameState, x: number, y: number): GameState {
  const prevBoard = state.history.length >= 1 ? state.history[state.history.length - 1] : null
  const result = placeStone(state.board, x, y, state.currentPlayer, prevBoard)
  if (!result) return state

  return {
    ...state,
    board: result.board,
    currentPlayer: (-state.currentPlayer) as Player,
    history: [...state.history, state.board],
    lastMove: [x, y] as [number, number],
  }
}

export function handleUndo(state: GameState): GameState {
  if (state.history.length === 0) return state
  return {
    ...state,
    board: state.history[state.history.length - 1],
    currentPlayer: (-state.currentPlayer) as Player,
    history: state.history.slice(0, -1),
    consecutivePasses: 0,
    gameOver: false,
    winner: null,
    lastMove: null,
  }
}

export function handleEnterTry(state: GameState): GameState {
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

export function handleExitTry(state: GameState): GameState {
  if (!state.savedBoard || !state.savedHistory) return state
  return {
    ...state,
    mode: 'review',
    board: state.savedBoard,
    currentPlayer: state.savedPlayer,
    history: state.savedHistory,
    reviewIndex: state.savedReviewIndex,
  }
}

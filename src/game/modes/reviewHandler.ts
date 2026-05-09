import type { GameState, Player } from '../types'

export function handlePlaceStone(state: GameState): GameState {
  return state
}

export function handleUndo(state: GameState): GameState {
  return state
}

export function handleEnterReview(state: GameState): GameState {
  if (state.moves.length === 0) return state
  return {
    ...state,
    mode: 'review',
    reviewIndex: state.moves.length,
    reviewFinalBoard: state.board,
    savedGameOver: state.gameOver,
    savedWinner: state.winner,
    gameOver: false,
    winner: null,
  }
}

export function handleExitReview(state: GameState): GameState {
  const finalBoard = state.reviewFinalBoard ?? state.board
  const lastMove = state.moves.length > 0 ? state.moves[state.moves.length - 1] : null
  return {
    ...state,
    mode: 'play',
    board: finalBoard,
    currentPlayer: lastMove ? (-lastMove.player) as Player : 1,
    reviewIndex: -1,
    reviewFinalBoard: null,
    gameOver: state.savedGameOver,
    winner: state.savedWinner,
  }
}

function getLastMoveForIndex(state: GameState, idx: number): [number, number] | null {
  if (idx <= 0 || idx - 1 >= state.moves.length) return null
  const m = state.moves[idx - 1]
  return m.pass ? null : [m.x, m.y]
}

function getBoardForIndex(state: GameState, idx: number) {
  if (idx >= state.moves.length) return state.reviewFinalBoard ?? state.board
  return state.history[idx]
}

export function handleReviewPrev(state: GameState): GameState {
  if (state.mode !== 'review') return state
  const idx = Math.max(0, state.reviewIndex - 1)
  return {
    ...state,
    board: getBoardForIndex(state, idx),
    reviewIndex: idx,
    lastMove: getLastMoveForIndex(state, idx),
  }
}

export function handleReviewNext(state: GameState): GameState {
  if (state.mode !== 'review') return state
  const idx = Math.min(state.moves.length, state.reviewIndex + 1)
  return {
    ...state,
    board: getBoardForIndex(state, idx),
    reviewIndex: idx,
    lastMove: getLastMoveForIndex(state, idx),
  }
}

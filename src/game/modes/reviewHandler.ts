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
    reviewIndex: state.history.length - 1,
    gameOver: false,
    winner: null,
  }
}

export function handleExitReview(state: GameState): GameState {
  const lastBoard = state.history[state.history.length - 1]
  const lastMove = state.moves.length > 0 ? state.moves[state.moves.length - 1] : null
  return {
    ...state,
    mode: 'play',
    board: lastBoard,
    currentPlayer: lastMove
      ? lastMove.pass ? lastMove.player : (-lastMove.player) as Player
      : 1,
    reviewIndex: -1,
  }
}

function getLastMoveForIndex(state: GameState, idx: number): [number, number] | null {
  if (idx <= 0 || idx - 1 >= state.moves.length) return null
  const m = state.moves[idx - 1]
  return m.pass ? null : [m.x, m.y]
}

export function handleReviewPrev(state: GameState): GameState {
  if (state.mode !== 'review') return state
  const idx = Math.max(0, state.reviewIndex - 1)
  return {
    ...state,
    board: state.history[idx],
    reviewIndex: idx,
    lastMove: getLastMoveForIndex(state, idx),
  }
}

export function handleReviewNext(state: GameState): GameState {
  if (state.mode !== 'review') return state
  const idx = Math.min(state.history.length - 1, state.reviewIndex + 1)
  return {
    ...state,
    board: state.history[idx],
    reviewIndex: idx,
    lastMove: getLastMoveForIndex(state, idx),
  }
}

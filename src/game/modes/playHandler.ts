import type { GameState, Player, Move } from "../types";
import { placeStone, score, detectTerritoryDetailed } from "../logic";

export function handlePlaceStone(
  state: GameState,
  x: number,
  y: number,
): GameState {
  if (state.gameOver) return state;
  if (state.countingMode !== "none") return state;

  const prevBoard =
    state.history.length >= 1 ? state.history[state.history.length - 1] : null;
  const result = placeStone(state.board, x, y, state.currentPlayer, prevBoard);
  if (!result) return state;

  const newCaptures = { ...state.captures };
  if (state.currentPlayer === 1) newCaptures.black += result.captured;
  else newCaptures.white += result.captured;

  const move: Move = { x, y, player: state.currentPlayer, captured: result.captured };

  return {
    ...state,
    board: result.board,
    currentPlayer: -state.currentPlayer as Player,
    history: [...state.history, state.board],
    captures: newCaptures,
    consecutivePasses: 0,
    lastMove: [x, y] as [number, number],
    moves: [...state.moves, move],
  };
}

export function handleUndo(state: GameState): GameState {
  if (state.history.length === 0) return state;

  const lastUndo =
    state.moves.length > 0 ? state.moves[state.moves.length - 1] : null;

  // AI mode: undo 2 steps (human + AI) so current turn returns to human
  if (state.aiMode !== "none" && state.history.length >= 2) {
    const newHistory = state.history.slice(0, -2);
    const newBoard = state.history[state.history.length - 2];
    const newMoves = state.moves.slice(0, -2);
    const prevMove = newMoves.length > 0 ? newMoves[newMoves.length - 1] : null;

    const newCaptures = { ...state.captures };
    for (
      let i = state.moves.length - 1;
      i >= Math.max(0, state.moves.length - 2);
      i--
    ) {
      const move = state.moves[i];
      if (!move.pass) {
        const captured = move.captured ?? 0;
        if (move.player === 1) newCaptures.black -= captured;
        else newCaptures.white -= captured;
      }
    }

    return {
      ...state,
      board: newBoard,
      currentPlayer: prevMove ? (-prevMove.player as Player) : 1,
      history: newHistory,
      captures: newCaptures,
      moves: newMoves,
      consecutivePasses: prevMove?.pass ? 1 : 0,
      gameOver: false,
      winner: null,
      lastMove: null,
    };
  }

  // single undo: play (no AI) or AI mode with insufficient history
  const newHistory = state.history.slice(0, -1);
  const newCaptures = { ...state.captures };
  if (lastUndo && !lastUndo.pass) {
    const captured = lastUndo.captured ?? 0;
    if (lastUndo.player === 1) newCaptures.black -= captured;
    else newCaptures.white -= captured;
  }

  return {
    ...state,
    board: state.history[state.history.length - 1],
    currentPlayer: -state.currentPlayer as Player,
    history: newHistory,
    captures: newCaptures,
    moves: state.moves.slice(0, -1),
    consecutivePasses: lastUndo?.pass ? 1 : 0,
    gameOver: false,
    winner: null,
    lastMove: null,
  };
}

export function handlePass(state: GameState): GameState {
  if (state.gameOver || state.countingMode !== "none") return state;
  const move: Move = { x: -1, y: -1, player: state.currentPlayer, pass: true, captured: 0 };
  const newPasses = state.consecutivePasses + 1;
  if (newPasses >= 2) {
    const scores = score(state.board, state.captures, state.komi);
    return {
      ...state,
      consecutivePasses: newPasses,
      gameOver: true,
      winner:
        scores.black > scores.white
          ? 1
          : scores.white > scores.black
            ? -1
            : null,
      history: [...state.history, state.board],
      moves: [...state.moves, move],
    };
  }
  return {
    ...state,
    currentPlayer: -state.currentPlayer as Player,
    consecutivePasses: newPasses,
    history: [...state.history, state.board],
    lastMove: null,
    moves: [...state.moves, move],
  };
}

export function handleResign(state: GameState): GameState {
  if (state.gameOver) return state;
  return {
    ...state,
    gameOver: true,
    winner: -state.currentPlayer as Player,
    history: [...state.history, state.board],
  };
}

export function handleRequestCount(state: GameState): GameState {
  if (state.gameOver || state.moves.length < 2) return state;
  const result = detectTerritoryDetailed(
    state.board,
    state.captures,
    state.komi,
  );
  return {
    ...state,
    countingMode: "requested",
    countingTerritory: result.territory,
    countingRequester: state.currentPlayer,
    countingDeadStones: result.deadStones,
    countingBlackScore: result.blackScore,
    countingWhiteScore: result.whiteScore,
  };
}

export function handleAcceptCount(state: GameState): GameState {
  if (state.countingMode !== "requested" || !state.countingTerritory)
    return state;
  const b = state.countingBlackScore;
  const w = state.countingWhiteScore;
  return {
    ...state,
    gameOver: true,
    winner: b > w ? 1 : w > b ? -1 : null,
    countingMode: "none",
    countingTerritory: null,
    countingRequester: null,
    countingDeadStones: [],
    countingBlackScore: 0,
    countingWhiteScore: 0,
    history: [...state.history, state.board],
  };
}

export function handleRejectCount(state: GameState): GameState {
  if (state.countingMode !== "requested") return state;
  return {
    ...state,
    countingMode: "none",
    countingTerritory: null,
    countingRequester: null,
    countingDeadStones: [],
    countingBlackScore: 0,
    countingWhiteScore: 0,
  };
}

export const handleCancelCount = handleRejectCount;

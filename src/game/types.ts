export type Stone = 0 | 1 | -1 // 0=empty, 1=black, -1=white
export type Board = Stone[][]
export type Player = 1 | -1

export interface Move {
  x: number
  y: number
  player: Player
  pass?: boolean
  captured?: number
}

export interface GameRecord {
  id: string
  size: number
  date: string
  moves: Move[]
  result: string
  komi: number
}

export interface GameState {
  size: number
  board: Board
  currentPlayer: Player
  history: Board[]
  captures: { black: number; white: number }
  consecutivePasses: number
  gameOver: boolean
  winner: Player | null
  lastMove: [number, number] | null
  moves: Move[]
  mode: 'play' | 'review' | 'try'
  reviewIndex: number
  savedBoard: Board | null
  savedPlayer: Player
  savedHistory: Board[]
  savedReviewIndex: number
  savedMode: 'play' | 'review'
  savedGameOver: boolean
  savedWinner: Player | null
  countingMode: 'none' | 'requested'
  countingTerritory: Board | null
  countingRequester: Player | null
  countingDeadStones: { x: number; y: number; color: Stone }[]
  countingBlackScore: number
  countingWhiteScore: number
  komi: number
  aiMode: 'none' | 'black' | 'white'
}

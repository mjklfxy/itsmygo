import { createContext } from 'react'
import type { GameState } from '../game/types'
import type { GameAction } from '../game/reducer'

export interface GameContextValue {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

export const GameContext = createContext<GameContextValue | null>(null)

import { createContext, useContext, useReducer } from 'react'
import type { GameState } from '../game/types'
import type { GameAction } from '../game/reducer'
import { gameReducer, createInitialState } from '../game/reducer'

interface GameContextValue {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ size, komi, aiMode, children }: {
  size: number
  komi: number
  aiMode: 'none' | 'black' | 'white'
  children: React.ReactNode
}) {
  const [state, dispatch] = useReducer(gameReducer, null, () =>
    createInitialState(size, komi, aiMode)
  )
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGameContext(): GameContextValue {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGameContext must be used within GameProvider')
  return ctx
}

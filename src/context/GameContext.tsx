import { useReducer } from 'react'
import { gameReducer, createInitialState } from '../game/reducer'
import { GameContext } from './gameContextValue'

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

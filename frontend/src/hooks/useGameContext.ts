import { useContext } from 'react'
import { GameContext } from '../context/gameContextValue'

export function useGameContext() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGameContext must be used within GameProvider')
  return ctx
}

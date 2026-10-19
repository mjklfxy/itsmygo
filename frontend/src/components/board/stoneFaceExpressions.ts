export type Expression = 'happy' | 'neutral' | 'worried' | 'scared' | 'surprised'

/** Maps a group's remaining liberties to its visual mood without changing game rules. */
export function getExpression(liberties: number): Expression {
  if (liberties >= 4) return 'happy'
  if (liberties >= 3) return 'neutral'
  if (liberties >= 2) return 'worried'
  return 'scared'
}

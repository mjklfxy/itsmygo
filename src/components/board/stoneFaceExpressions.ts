export type Expression = 'happy' | 'neutral' | 'worried' | 'scared' | 'surprised'

export const FACES: Record<Expression, string> = {
  happy: '♥‿♥',
  neutral: '－_－',
  worried: '>_<',
  scared: 'T_T',
  surprised: 'O_O',
}

export function getExpression(liberties: number): Expression {
  if (liberties >= 4) return 'happy'
  if (liberties >= 3) return 'neutral'
  if (liberties >= 2) return 'worried'
  return 'scared'
}

export function getStoneExpression(liberties: number, isBursting: boolean): Expression {
  void isBursting
  return getExpression(liberties)
}

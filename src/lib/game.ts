export type Choice = 'rock' | 'paper' | 'scissors'
export type RoundResult = 'p1_win' | 'p2_win' | 'draw'

export const choices: Choice[] = ['rock', 'paper', 'scissors']

export const meta: Record<Choice, { emoji: string; label: string; color: string }> = {
  rock: { emoji: '🪨', label: 'Rock', color: 'from-amber-500 to-orange-600' },
  paper: { emoji: '📄', label: 'Paper', color: 'from-sky-400 to-blue-600' },
  scissors: { emoji: '✂️', label: 'Scissors', color: 'from-rose-400 to-red-600' },
}

const beats: Record<Choice, Choice> = { rock: 'scissors', scissors: 'paper', paper: 'rock' }

export function getComputerChoice(): Choice {
  return choices[Math.floor(Math.random() * choices.length)]
}

export function getResult(a: Choice, b: Choice): 'win' | 'lose' | 'draw' {
  if (a === b) return 'draw'
  return beats[a] === b ? 'win' : 'lose'
}

export function getRoundResult(a: Choice, b: Choice): RoundResult {
  if (a === b) return 'draw'
  return beats[a] === b ? 'p1_win' : 'p2_win'
}

export function getReason(a: Choice, b: Choice): string {
  if (a === b) return 'Both chose the same'
  if (beats[a] === b) return `${meta[a].label} beats ${meta[b].label}`
  return `${meta[b].label} beats ${meta[a].label}`
}

export interface RoundData {
  round: number
  p1_choice: Choice | null
  p2_choice: Choice | null
  result: RoundResult | null
  reason: string | null
}

export interface Room {
  id: string
  code: string
  player1_id: string
  player2_id: string | null
  status: 'waiting' | 'playing' | 'finished'
  current_round: number
  rounds: RoundData[]
  round_started_at: string | null
  p1_ready: boolean
  p2_ready: boolean
  winner_id: string | null
  created_at: string
}

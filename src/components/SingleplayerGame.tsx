import { useState } from 'react'
import { MAX_ROUNDS } from '../lib/constants'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import { choices, meta, getComputerChoice, getResult, type Choice } from '../lib/game'

type Phase = 'pick' | 'result' | 'finished'

interface Props {
  onBack?: () => void
}

export default function SingleplayerGame({ onBack }: Props) {
  const { player, signOut } = useAuth()
  const { toast } = useToast()
  const [phase, setPhase] = useState<Phase>('pick')
  const [round, setRound] = useState(1)
  const [pScore, setPScore] = useState(0)
  const [cScore, setCScore] = useState(0)
  const [pChoice, setPChoice] = useState<Choice | null>(null)
  const [cChoice, setCChoice] = useState<Choice | null>(null)
  const [res, setRes] = useState<'win' | 'lose' | 'draw' | null>(null)
  const [history, setHistory] = useState<{ round: number; p: Choice; c: Choice; r: string }[]>([])

  function play(pick: Choice) {
    const comp = getComputerChoice()
    const r = getResult(pick, comp)
    setPChoice(pick); setCChoice(comp); setRes(r)
    if (r === 'win') setPScore((s) => s + 1)
    if (r === 'lose') setCScore((s) => s + 1)
    setHistory((h) => [...h, { round, p: pick, c: comp, r }])
    setPhase('result')
  }

  function next() {
    if (round >= MAX_ROUNDS) { setPhase('finished'); return }
    setRound((r) => r + 1); setPChoice(null); setCChoice(null); setRes(null); setPhase('pick')
  }

  function restart() {
    setPhase('pick'); setRound(1); setPScore(0); setCScore(0)
    setPChoice(null); setCChoice(null); setRes(null); setHistory([])
    toast('New game!', 'info')
  }

  return (
    <div className="min-h-screen bg-surface text-text flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <button onClick={onBack} className="text-text-soft hover:text-text text-sm transition-colors">← Back</button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-soft">{player?.username}</span>
          <button onClick={signOut} className="bg-surface-hover hover:opacity-80 text-sm px-4 py-2 rounded-xl transition-all">Logout</button>
        </div>
      </div>

      <h1 className="text-4xl font-extrabold mb-1">Rock <span className="text-amber">Paper</span> Scissors</h1>
      <p className="text-text-soft mb-6 text-sm">Best of {MAX_ROUNDS}</p>

      <div className="bg-surface-raised rounded-2xl px-8 py-4 flex items-center gap-8 md:gap-16 mb-6">
        <div className="text-center">
          <p className="text-xs text-text-muted mb-1">You</p>
          <p className="text-3xl font-bold text-green">{pScore}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted mb-1">Round</p>
          <p className="text-lg font-semibold text-text-soft">{phase === 'finished' ? MAX_ROUNDS : round}/{MAX_ROUNDS}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted mb-1">Computer</p>
          <p className="text-3xl font-bold text-red">{cScore}</p>
        </div>
      </div>

      {phase === 'finished' ? (
        <div className="text-center space-y-5">
          <p className="text-4xl font-bold">{pScore > cScore ? '🎉 You are the Champion!' : cScore > pScore ? '💻 Computer wins!' : "🤝 It's a Tie!"}</p>
          <p className="text-text-soft">You {pScore} : {cScore} Computer</p>
          <div className="max-w-xs mx-auto space-y-1">
            {history.map((h) => (
              <div key={h.round} className="flex items-center justify-between bg-surface-over/50 rounded-xl px-4 py-2 text-sm">
                <span className="text-text-muted">R{h.round}</span>
                <span>{meta[h.p].emoji}</span>
                <span className={`font-medium ${h.r === 'win' ? 'text-green' : h.r === 'lose' ? 'text-red' : 'text-yellow'}`}>{h.r === 'win' ? 'Win' : h.r === 'lose' ? 'Lose' : 'Draw'}</span>
                <span>{meta[h.c].emoji}</span>
              </div>
            ))}
          </div>
          <button onClick={restart} className="bg-indigo hover:opacity-90 px-10 py-3 rounded-xl font-semibold transition-all">Play Again</button>
        </div>
      ) : (
        <>
          <div className="flex gap-4 mb-6">
            {choices.map((c) => (
              <button key={c} onClick={() => play(c)} disabled={phase !== 'pick'}
                className={`relative text-5xl rounded-2xl p-5 transition-all ${pChoice === c ? `bg-gradient-to-b ${meta[c].color} scale-110` : phase === 'pick' ? 'bg-surface-over hover:bg-surface-hover hover:scale-105' : 'bg-surface-over/50 opacity-30'} disabled:cursor-not-allowed`}>
                {meta[c].emoji}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-text-soft">{meta[c].label}</span>
              </button>
            ))}
          </div>

          {phase === 'result' && pChoice && cChoice && res && (
            <div className="text-center space-y-4">
              <div className="flex items-center gap-8 md:gap-14 text-xl">
                <div className="text-center">
                  <p className="text-text-soft text-xs mb-2">You</p>
                  <span className="text-6xl md:text-7xl block">{meta[pChoice].emoji}</span>
                </div>
                <span className="text-2xl text-text-muted font-bold">VS</span>
                <div className="text-center">
                  <p className="text-text-soft text-xs mb-2">Computer</p>
                  <span className="text-6xl md:text-7xl block">{meta[cChoice].emoji}</span>
                </div>
              </div>
              <p className={`text-2xl font-bold ${res === 'win' ? 'text-green' : res === 'lose' ? 'text-red' : 'text-yellow'}`}>
                {res === 'win' ? 'You Win!' : res === 'lose' ? 'You Lose!' : "It's a Draw!"}
              </p>
              <button onClick={next} className="bg-indigo hover:opacity-90 px-10 py-3 rounded-xl font-semibold transition-all">
                {round < MAX_ROUNDS ? 'Next Round →' : 'See Results →'}
              </button>
            </div>
          )}

          {phase === 'pick' && <p className="text-text-soft text-sm">Pick your move</p>}
        </>
      )}
    </div>
  )
}

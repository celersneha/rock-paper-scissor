import { useState } from 'react'
import { MAX_ROUNDS } from '../lib/constants'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import { choices, meta, getComputerChoice, getResult, type Choice } from '../lib/game'

type Phase = 'pick' | 'result' | 'finished'

export default function SingleplayerGame() {
  const { player, signOut } = useAuth()
  const { toast } = useToast()
  const [phase, setPhase] = useState<Phase>('pick')
  const [round, setRound] = useState(1)
  const [playerScore, setPlayerScore] = useState(0)
  const [computerScore, setComputerScore] = useState(0)
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null)
  const [computerChoice, setComputerChoice] = useState<Choice | null>(null)
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null)
  const [roundHistory, setRoundHistory] = useState<{ round: number; player: Choice; computer: Choice; result: string }[]>([])

  function play(pick: Choice) {
    const comp = getComputerChoice()
    const res = getResult(pick, comp)
    setPlayerChoice(pick); setComputerChoice(comp); setResult(res)
    if (res === 'win') setPlayerScore((s) => s + 1)
    if (res === 'lose') setComputerScore((s) => s + 1)
    setRoundHistory((h) => [...h, { round, player: pick, computer: comp, result: res }])
    setPhase('result')
  }

  const isChampion = phase === 'finished' && playerScore > computerScore
  const isLoser = phase === 'finished' && computerScore > playerScore

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <span className="text-sm text-indigo-400 font-medium">{player?.username}</span>
        <button onClick={signOut} className="bg-gray-800 hover:bg-gray-700 text-sm px-4 py-2 rounded-lg">Logout</button>
      </div>

      <h1 className="text-4xl font-extrabold mb-2">Rock <span className="text-amber-400">Paper</span> Scissors</h1>
      <p className="text-gray-500 mb-6">Singleplayer — Best of {MAX_ROUNDS}</p>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl px-8 py-4 flex items-center gap-8 md:gap-16 mb-8">
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">You</p>
          <p className="text-3xl font-bold text-green-400">{playerScore}</p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Round</p>
          <p className="text-xl font-semibold text-gray-300">{phase === 'finished' ? MAX_ROUNDS : round}/{MAX_ROUNDS}</p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Computer</p>
          <p className="text-3xl font-bold text-red-400">{computerScore}</p>
        </div>
      </div>

      {phase === 'finished' ? (
        <div className="text-center space-y-6">
          <p className="text-4xl font-bold">{isChampion ? '🎉 You are the Champion!' : isLoser ? '💻 Computer wins!' : "🤝 It's a Tie!"}</p>
          <p className="text-lg text-gray-400">You {playerScore} : {computerScore} Computer</p>
          <div className="max-w-md mx-auto space-y-1">
            {roundHistory.map((h) => (
              <div key={h.round} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-2 text-sm">
                <span className="text-gray-500">R{h.round}</span>
                <span>{meta[h.player].emoji}</span>
                <span className={`font-medium ${h.result === 'win' ? 'text-green-400' : h.result === 'lose' ? 'text-red-400' : 'text-yellow-400'}`}>{h.result === 'win' ? 'Win' : h.result === 'lose' ? 'Lose' : 'Draw'}</span>
                <span>{meta[h.computer].emoji}</span>
              </div>
            ))}
          </div>
          <button onClick={() => { setPhase('pick'); setRound(1); setPlayerScore(0); setComputerScore(0); setRoundHistory([]); toast('New game!', 'info') }}
            className="bg-indigo-600 hover:bg-indigo-500 px-10 py-3 rounded-xl text-lg font-semibold">Play Again</button>
        </div>
      ) : (
        <>
          <div className="flex gap-4 mb-8">
            {choices.map((c) => (
              <button key={c} onClick={() => play(c)} disabled={phase !== 'pick'}
                className={`relative text-6xl rounded-2xl p-6 transition-all ${playerChoice === c ? `bg-gradient-to-b ${meta[c].color} scale-110 shadow-lg` : phase === 'pick' ? 'bg-gray-800 hover:bg-gray-700 hover:scale-105' : 'bg-gray-800/50 opacity-40'} disabled:cursor-not-allowed`}>
                {meta[c].emoji}
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-400">{meta[c].label}</span>
              </button>
            ))}
          </div>

          {phase === 'result' && playerChoice && computerChoice && result && (
            <div className="text-center space-y-5">
              <div className="flex items-center gap-8 md:gap-14 text-xl">
                <div className="text-center">
                  <p className="text-gray-500 text-xs mb-2">You</p>
                  <span className="text-6xl md:text-7xl block">{meta[playerChoice].emoji}</span>
                </div>
                <span className="text-3xl text-gray-600 font-bold">VS</span>
                <div className="text-center">
                  <p className="text-gray-500 text-xs mb-2">Computer</p>
                  <span className="text-6xl md:text-7xl block">{meta[computerChoice].emoji}</span>
                </div>
              </div>
              <p className={`text-2xl font-bold ${result === 'win' ? 'text-green-400' : result === 'lose' ? 'text-red-400' : 'text-yellow-400'}`}>
                {result === 'win' ? 'You Win!' : result === 'lose' ? 'You Lose!' : "It's a Draw!"}
              </p>
              <button onClick={() => round >= MAX_ROUNDS ? setPhase('finished') : (setRound((r) => r + 1), setPlayerChoice(null), setComputerChoice(null), setResult(null), setPhase('pick'))}
                className="bg-indigo-600 hover:bg-indigo-500 px-10 py-3 rounded-xl text-lg font-semibold">
                {round < MAX_ROUNDS ? 'Next Round →' : 'See Results →'}
              </button>
            </div>
          )}

          {phase === 'pick' && <p className="text-gray-500 mt-4">Pick your move</p>}
        </>
      )}
    </div>
  )
}

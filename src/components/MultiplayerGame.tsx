import { useEffect, useState, useRef } from 'react'
import { MAX_ROUNDS } from '../lib/constants'
import { useRoom } from '../contexts/RoomContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import { choices, meta, type Choice } from '../lib/game'

interface RevealData {
  myChoice: Choice
  opponentChoice: Choice
  result: string
  reason: string | null
  round: number
}

interface Props {
  onBack?: () => void
}

export default function MultiplayerGame({ onBack }: Props) {
  const { room, playerNum, opponentName, advanceToNextRound, leaveRoom, makeChoice } = useRoom()
  const { player } = useAuth()
  const { toast } = useToast()
  const [localChoice, setLocalChoice] = useState<Choice | null>(null)
  const [reveal, setReveal] = useState<RevealData | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const prevRoundRef = useRef(room?.current_round ?? 0)
  const revealRoundRef = useRef(0)

  useEffect(() => {
    if (!room || !playerNum) return

    const curRound = room.current_round
    const round = room.rounds[curRound - 1]

    if (round?.result && revealRoundRef.current !== curRound) {
      const myKey = playerNum === 1 ? 'p1_choice' : 'p2_choice'
      const oppKey = playerNum === 1 ? 'p2_choice' : 'p1_choice'
      const myC = round[myKey] as Choice | undefined
      const oppC = round[oppKey] as Choice | undefined

      if (myC && oppC) {
        revealRoundRef.current = curRound
        setReveal({
          myChoice: myC, opponentChoice: oppC,
          result: round.result!, reason: round.reason,
          round: curRound,
        })
      }
    }
  }, [room, playerNum])

  async function handleChoice(c: Choice) {
    if (localChoice || reveal) return
    setLocalChoice(c)
    setSubmitting(true)
    await makeChoice(c)
    setSubmitting(false)
  }

  async function handleNextRound() {
    setLocalChoice(null)
    setReveal(null)
    const err = await advanceToNextRound()
    if (err) toast(err, 'error')
  }

  function handleLeave() {
    leaveRoom()
    toast('Left the game', 'info')
    onBack?.()
  }

  if (!room || !playerNum) return null

  const opponentLabel = opponentName || 'Opponent'
  let scores = { me: 0, opp: 0 }
  room.rounds.forEach((r) => {
    if (r.result === 'p1_win') { if (playerNum === 1) scores.me++; else scores.opp++ }
    else if (r.result === 'p2_win') { if (playerNum === 2) scores.me++; else scores.opp++ }
  })

  const isFinished = room.status === 'finished'

  return (
    <div className="min-h-screen bg-surface text-text flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <span className="text-sm text-text-soft">{player?.username}</span>
        <button onClick={handleLeave} className="bg-surface-hover hover:opacity-80 text-sm px-4 py-2 rounded-xl transition-all">Leave</button>
      </div>

      <h1 className="text-3xl font-extrabold mb-1">Multiplayer</h1>
      <p className="text-text-soft text-sm mb-6">Room: <span className="font-mono text-amber">{room.code}</span></p>

      <div className="bg-surface-raised rounded-2xl px-8 py-4 flex items-center gap-8 md:gap-16 mb-6">
        <div className="text-center">
          <p className="text-xs text-text-muted mb-1">You</p>
          <p className="text-3xl font-bold text-green">{scores.me}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted mb-1">Round</p>
          <p className="text-lg font-semibold text-text-soft">{room.current_round}/{MAX_ROUNDS}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted mb-1">{opponentLabel}</p>
          <p className="text-3xl font-bold text-red">{scores.opp}</p>
        </div>
      </div>

      {reveal ? (
        <div className="bg-surface-raised rounded-2xl p-8 w-full max-w-md text-center space-y-6 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-xs text-text-muted mb-2">You</p>
              <div className="text-6xl">{meta[reveal.myChoice].emoji}</div>
              <p className="text-sm text-text-soft mt-1 capitalize">{reveal.myChoice}</p>
            </div>
            <span className="text-2xl text-text-muted font-bold">VS</span>
            <div className="text-center">
              <p className="text-xs text-text-muted mb-2">{opponentLabel}</p>
              <div className="text-6xl">{meta[reveal.opponentChoice].emoji}</div>
              <p className="text-sm text-text-soft mt-1 capitalize">{reveal.opponentChoice}</p>
            </div>
          </div>

          <div className={`text-2xl font-bold py-3 px-6 rounded-xl ${
            reveal.result === 'draw' ? 'bg-yellow/20 text-yellow' :
            ((reveal.result === 'p1_win' && playerNum === 1) || (reveal.result === 'p2_win' && playerNum === 2))
              ? 'bg-green/20 text-green' : 'bg-red/20 text-red'
          }`}>
            {reveal.result === 'draw' ? "It's a Draw!" :
             ((reveal.result === 'p1_win' && playerNum === 1) || (reveal.result === 'p2_win' && playerNum === 2))
              ? 'You Won!' : `${opponentLabel} Won!`}
          </div>

          {reveal.reason && (
            <p className="text-text-soft text-sm">{reveal.reason}</p>
          )}

          <button onClick={handleNextRound}
            className="bg-indigo hover:opacity-90 px-10 py-3 rounded-xl font-semibold transition-all">
            {room.current_round < MAX_ROUNDS ? 'Next Round →' : 'See Results →'}
          </button>
        </div>
      ) : isFinished ? (
        <div className="text-center space-y-5">
          <p className="text-5xl">{scores.me > scores.opp ? '🎉' : scores.opp > scores.me ? '😞' : '🤝'}</p>
          <p className="text-3xl font-bold">{scores.me > scores.opp ? 'You win!' : scores.opp > scores.me ? `${opponentLabel} wins!` : "It's a Tie!"}</p>
          <p className="text-text-soft">{scores.me} - {scores.opp}</p>
          <div className="max-w-xs mx-auto space-y-1">
            {room.rounds.map((r, i) => (
              <div key={i} className="flex items-center justify-between bg-surface-over/50 rounded-xl px-4 py-2 text-sm">
                <span className="text-text-muted">R{r.round}</span>
                <span className="text-lg">{r.p1_choice ? meta[r.p1_choice].emoji : '❓'}</span>
                <span className={`font-medium ${r.result === 'p1_win' ? 'text-green' : r.result === 'p2_win' ? 'text-red' : 'text-yellow'}`}>
                  {r.result === 'p1_win' ? 'P1' : r.result === 'p2_win' ? 'P2' : '—'}
                </span>
                <span className="text-lg">{r.p2_choice ? meta[r.p2_choice].emoji : '❓'}</span>
              </div>
            ))}
          </div>
          <button onClick={handleLeave} className="bg-indigo hover:opacity-90 px-10 py-3 rounded-xl font-semibold transition-all">Back to Menu</button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-12 md:gap-24 mb-8 text-center">
            <div>
              <p className="text-text-soft text-xs mb-2">You</p>
              <div className="text-7xl min-w-[5rem]">
                {localChoice ? meta[localChoice].emoji : '❔'}
              </div>
            </div>
            <span className="text-2xl text-text-muted font-bold">VS</span>
            <div>
              <p className="text-text-soft text-xs mb-2">{opponentLabel}</p>
              <div className="text-7xl min-w-[5rem]">❔</div>
            </div>
          </div>

          <div className="flex gap-4 mb-4">
            {choices.map((c) => (
              <button key={c} onClick={() => handleChoice(c)} disabled={!!localChoice || submitting}
                className={`relative text-5xl rounded-2xl p-5 transition-all ${localChoice === c ? `bg-gradient-to-b ${meta[c].color} scale-110` : !localChoice ? 'bg-surface-over hover:bg-surface-hover hover:scale-105' : 'bg-surface-over/50 opacity-30'} disabled:cursor-not-allowed`}>
                {meta[c].emoji}
              </button>
            ))}
          </div>
          <p className="text-text-soft text-sm">{localChoice ? 'Waiting for opponent...' : 'Choose your move'}</p>
        </>
      )}
    </div>
  )
}
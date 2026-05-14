import { useEffect, useState, useRef } from 'react'
import { MAX_ROUNDS } from '../lib/constants'
import { getRoom } from '../lib/api'
import { useRoom } from '../contexts/RoomContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import { choices, meta, type Choice, type RoundData } from '../lib/game'

type PickPhase = 'choosing' | 'reveal' | 'round_result' | 'finished'

interface Props {
  onBack?: () => void
}

export default function MultiplayerGame({ onBack }: Props) {
  const { room, playerNum, opponentName, myChoice, opponentChoice, roundResult, reason, leaveRoom, makeChoice } = useRoom()
  const { player } = useAuth()
  const { toast } = useToast()
  const [pickPhase, setPickPhase] = useState<PickPhase>('choosing')
  const [localChoice, setLocalChoice] = useState<Choice | null>(null)
  const [localOpponentChoice, setLocalOpponentChoice] = useState<Choice | null>(null)
  const [localRoundResult, setLocalRoundResult] = useState<RoundData | null>(null)

  useEffect(() => {
    setLocalChoice(null)
    setLocalOpponentChoice(null)
    setLocalRoundResult(null)

    if (!room || room.status === 'finished') { setPickPhase('finished'); return }
    if (room.status !== 'playing') return

    setPickPhase('choosing')
  }, [room?.id, room?.status, room?.current_round])

  useEffect(() => {
    if (!room || room.status !== 'playing') return
    const id = setInterval(async () => {
      try {
        const updated = await getRoom(room.id)
        if (!updated) return
        const round = updated.rounds?.[updated.current_round - 1]
        if (!round) return
        const oppKey = playerNum === 1 ? 'p2_choice' : 'p1_choice'
        const opp = round[oppKey] as Choice | null
        if (opp) setLocalOpponentChoice(opp)
        if (round.result) {
          setLocalRoundResult(round as RoundData)
          setPickPhase('round_result')
        }
      } catch {}
    }, 1000)
    return () => clearInterval(id)
  }, [room?.id, room?.status, room?.current_round, playerNum])

  const bothChosen = localChoice && (localOpponentChoice || opponentChoice)
  useEffect(() => {
    if (bothChosen && pickPhase === 'choosing') setPickPhase('reveal')
  }, [bothChosen, pickPhase])

  function handleChoice(c: Choice) {
    if (pickPhase !== 'choosing') return
    setLocalChoice(c)
    makeChoice(c)
  }

  function handleNext() {
    setLocalChoice(null)
    setLocalOpponentChoice(null)
    setLocalRoundResult(null)
    setPickPhase('choosing')
  }

  function handleLeave() {
    leaveRoom()
    toast('Left the game', 'info')
    onBack?.()
  }

  if (!room || !playerNum) return null

  const displayOpponentChoice = localOpponentChoice || opponentChoice
  const displayRoundResult = localRoundResult || (roundResult ? { result: roundResult, reason } : null)
  const displayReason = displayRoundResult?.reason || reason

  const opponentLabel = opponentName || 'Opponent'
  let scores = { me: 0, opp: 0 }
  room.rounds.forEach((r) => {
    if (r.result === 'p1_win') { if (playerNum === 1) scores.me++; else scores.opp++ }
    else if (r.result === 'p2_win') { if (playerNum === 2) scores.me++; else scores.opp++ }
  })

  const isFinished = pickPhase === 'finished'

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
          <p className="text-lg font-semibold text-text-soft">{isFinished ? MAX_ROUNDS : room.current_round}/{MAX_ROUNDS}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted mb-1">{opponentLabel}</p>
          <p className="text-3xl font-bold text-red">{scores.opp}</p>
        </div>
      </div>

      <div className="flex items-center gap-12 md:gap-24 mb-8 text-center">
        <div>
          <p className="text-text-soft text-xs mb-2">You</p>
          <div className="text-7xl min-w-[5rem]">
            {localChoice
              ? meta[localChoice].emoji
              : (pickPhase === 'round_result' && myChoice ? meta[myChoice].emoji : '❔')}
          </div>
        </div>
        <span className="text-2xl text-text-muted font-bold">VS</span>
        <div>
          <p className="text-text-soft text-xs mb-2">{opponentLabel}</p>
          <div className="text-7xl min-w-[5rem]">
            {(pickPhase === 'reveal' || pickPhase === 'round_result')
              ? (displayOpponentChoice ? meta[displayOpponentChoice].emoji : '❔')
              : '❔'}
          </div>
        </div>
      </div>

      {pickPhase === 'round_result' && displayRoundResult && (
        <div className="text-center space-y-3 mb-4">
          <p className={`text-2xl font-bold ${displayRoundResult.result === 'draw' ? 'text-yellow' : ((displayRoundResult.result === 'p1_win' && playerNum === 1) || (displayRoundResult.result === 'p2_win' && playerNum === 2)) ? 'text-green' : 'text-red'}`}>
            {displayRoundResult.result === 'draw' ? "It's a Draw!" : ((displayRoundResult.result === 'p1_win' && playerNum === 1) || (displayRoundResult.result === 'p2_win' && playerNum === 2)) ? 'You Win!' : `${opponentLabel} Wins!`}
          </p>
          {displayReason && <p className="text-text-soft text-sm">{displayReason}</p>}
          <button onClick={handleNext} className="bg-indigo hover:opacity-90 px-8 py-2 rounded-xl font-semibold transition-all">
            {room.current_round < MAX_ROUNDS ? 'Next Round →' : 'See Results →'}
          </button>
        </div>
      )}

      {pickPhase === 'choosing' && (
        <>
          <div className="flex gap-4 mb-4">
            {choices.map((c) => (
              <button key={c} onClick={() => handleChoice(c)} disabled={!!localChoice}
                className={`relative text-5xl rounded-2xl p-5 transition-all ${localChoice === c ? `bg-gradient-to-b ${meta[c].color} scale-110` : !localChoice ? 'bg-surface-over hover:bg-surface-hover hover:scale-105' : 'bg-surface-over/50 opacity-30'} disabled:cursor-not-allowed`}>
                {meta[c].emoji}
              </button>
            ))}
          </div>
          <p className="text-text-soft text-sm">{localChoice ? 'Waiting for opponent...' : 'Choose your move'}</p>
        </>
      )}

      {pickPhase === 'reveal' && (
        <div className="flex items-center gap-2 text-amber mb-4">
          <span className="inline-block w-2 h-2 bg-amber rounded-full animate-pulse" />
          <span className="text-sm">Revealing...</span>
        </div>
      )}

      {isFinished ? (
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
      ) : null}
    </div>
  )
}
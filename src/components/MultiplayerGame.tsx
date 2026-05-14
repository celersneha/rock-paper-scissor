import { useEffect, useState } from 'react'
import { MAX_ROUNDS, ROUND_TIME } from '../lib/constants'
import { useRoom } from '../contexts/RoomContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import { choices, meta, type Choice } from '../lib/game'

type PickPhase = 'waiting' | 'choosing' | 'reveal' | 'round_result' | 'finished'

export default function MultiplayerGame() {
  const {
    room, playerNum, opponentName, roundTimeLeft,
    myChoice, opponentChoice, roundResult, reason,
    leaveRoom, makeChoice, resetResult,
  } = useRoom()
  const { player } = useAuth()
  const { toast } = useToast()
  const [pickPhase, setPickPhase] = useState<PickPhase>('waiting')
  const [localChoice, setLocalChoice] = useState<Choice | null>(null)

  useEffect(() => {
    if (!room) return
    if (room.status === 'finished') { setPickPhase('finished'); return }

    const round = room.rounds[room.current_round - 1]

    if (round?.result) {
      setPickPhase('round_result')
      return
    }

    if (roundTimeLeft > 0 && roundTimeLeft < ROUND_TIME) {
      setPickPhase('choosing')
      return
    }

    if (room.p1_ready && room.p2_ready && room.current_round >= 1) {
      setPickPhase('choosing')
    }
  }, [room, roundTimeLeft])

  function handleChoice(c: Choice) {
    if (pickPhase !== 'choosing') return
    setLocalChoice(c)
    makeChoice(c)

    setTimeout(() => {
      setPickPhase('reveal')
    }, 1200)
  }

  function handleNextRound() {
    setLocalChoice(null)
    resetResult()
    setPickPhase('waiting')
    setTimeout(() => setPickPhase('choosing'), 300)
  }

  function handleLeave() {
    leaveRoom()
    toast('Left the game', 'info')
  }

  if (!room || !playerNum) return null

  const isMyTurn = pickPhase === 'choosing' && !localChoice
  const isFinished = pickPhase === 'finished'
  const opponentLabel = opponentName || 'Opponent'

  let scores = { me: 0, opp: 0 }
  room.rounds.forEach((r) => {
    if (r.result === 'p1_win') {
      if (playerNum === 1) scores.me++
      else scores.opp++
    } else if (r.result === 'p2_win') {
      if (playerNum === 2) scores.me++
      else scores.opp++
    }
  })

  const meWon = isFinished && scores.me > scores.opp
  const oppWon = isFinished && scores.opp > scores.me

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <span className="text-sm text-indigo-400 font-medium">{player?.username}</span>
        <button onClick={handleLeave} className="bg-gray-800 hover:bg-gray-700 text-sm px-4 py-2 rounded-lg">Leave</button>
      </div>

      <h1 className="text-3xl font-extrabold mb-2">Multiplayer</h1>
      <p className="text-gray-500 mb-6">Room: <span className="font-mono text-amber-400">{room.code}</span></p>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl px-8 py-4 flex items-center gap-8 md:gap-16 mb-6">
        <div className="text-center">
          <p className="text-xs text-gray-500">You</p>
          <p className="text-3xl font-bold text-green-400">{scores.me}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Round</p>
          <p className="text-xl font-semibold text-gray-300">{isFinished ? MAX_ROUNDS : room.current_round}/{MAX_ROUNDS}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">{opponentLabel}</p>
          <p className="text-3xl font-bold text-red-400">{scores.opp}</p>
        </div>
      </div>

      {isFinished ? (
        <div className="text-center space-y-6">
          <p className="text-5xl">{meWon ? '🎉' : oppWon ? '😞' : '🤝'}</p>
          <p className="text-3xl font-bold">{meWon ? 'You win!' : oppWon ? `${opponentLabel} wins!` : "It's a Tie!"}</p>
          <p className="text-gray-400">{scores.me} - {scores.opp}</p>

          <div className="max-w-md mx-auto space-y-1">
            {room.rounds.map((r, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-2 text-sm">
                <span className="text-gray-500">R{r.round}</span>
                <span className="text-lg">{r.p1_choice ? meta[r.p1_choice].emoji : '❓'}</span>
                <span className={`font-medium ${r.result === 'p1_win' ? 'text-green-400' : r.result === 'p2_win' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {r.result === 'p1_win' ? 'P1 Win' : r.result === 'p2_win' ? 'P2 Win' : 'Draw'}
                </span>
                <span className="text-lg">{r.p2_choice ? meta[r.p2_choice].emoji : '❓'}</span>
              </div>
            ))}
          </div>

          <button onClick={handleLeave} className="bg-indigo-600 hover:bg-indigo-500 px-10 py-3 rounded-xl text-lg font-semibold">
            Back to Menu
          </button>
        </div>
      ) : (
        <>
          {!roundTimeLeft || roundTimeLeft > 0 ? (
            <div className="text-center mb-6">
              <p className="text-5xl font-bold mb-1">{roundTimeLeft}</p>
              <p className="text-gray-500 text-sm">seconds remaining</p>
            </div>
          ) : null}

          <div className="flex items-center gap-12 md:gap-24 mb-8 text-center">
            <div>
              <p className="text-gray-500 text-xs mb-2">You</p>
              <div className="text-7xl min-w-[5rem]">
                {localChoice ? meta[localChoice].emoji : (pickPhase === 'choosing' && !localChoice ? '❔' : (pickPhase === 'reveal' || pickPhase === 'round_result') && myChoice ? meta[myChoice].emoji : '❔')}
              </div>
            </div>
            <span className="text-2xl text-gray-600 font-bold">VS</span>
            <div>
              <p className="text-gray-500 text-xs mb-2">{opponentLabel}</p>
              <div className="text-7xl min-w-[5rem]">
                {pickPhase === 'reveal' || pickPhase === 'round_result'
                  ? (opponentChoice ? meta[opponentChoice].emoji : '❔')
                  : '❔'}
              </div>
            </div>
          </div>

          {pickPhase === 'round_result' && roundResult && (
            <div className="text-center space-y-3 mb-4">
              <p className={`text-2xl font-bold ${roundResult === 'draw' ? 'text-yellow-400' : (roundResult === 'p1_win' && playerNum === 1) || (roundResult === 'p2_win' && playerNum === 2) ? 'text-green-400' : 'text-red-400'}`}>
                {roundResult === 'draw' ? "It's a Draw!" : (roundResult === 'p1_win' && playerNum === 1) || (roundResult === 'p2_win' && playerNum === 2) ? 'You Win!' : `${opponentLabel} Wins!`}
              </p>
              {reason && <p className="text-gray-400 text-sm">{reason}</p>}
              <button onClick={handleNextRound} className="bg-indigo-600 hover:bg-indigo-500 px-8 py-2 rounded-xl text-base font-semibold">
                {room.current_round < MAX_ROUNDS ? 'Next Round →' : 'See Results →'}
              </button>
            </div>
          )}

          {pickPhase === 'choosing' && (
            <>
              <div className="flex gap-4 mb-4">
                {choices.map((c) => (
                  <button key={c} onClick={() => handleChoice(c)} disabled={!isMyTurn}
                    className={`relative text-5xl rounded-2xl p-5 transition-all ${localChoice === c ? `bg-gradient-to-b ${meta[c].color} scale-110 shadow-lg` : isMyTurn ? 'bg-gray-800 hover:bg-gray-700 hover:scale-105' : 'bg-gray-800/50 opacity-40'} disabled:cursor-not-allowed`}>
                    {meta[c].emoji}
                  </button>
                ))}
              </div>
              {localChoice && <p className="text-gray-500 text-sm">Waiting for opponent...</p>}
              {!localChoice && <p className="text-gray-500 text-sm">Choose your move</p>}
            </>
          )}

          {pickPhase === 'waiting' && (
            <div className="flex items-center gap-2 text-yellow-400">
              <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-sm">Waiting for round to start...</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

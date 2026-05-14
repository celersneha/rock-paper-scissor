import { useEffect, useState, useRef } from 'react'
import { MAX_ROUNDS } from '../lib/constants'
import { useRoom } from '../contexts/RoomContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from './Toast'
import { choices, meta, type Choice, type RoundResult, type Room } from '../lib/game'

type Phase = 'choosing' | 'result' | 'waiting' | 'finished'

interface ResultData {
  myChoice: Choice
  opponentChoice: Choice
  result: RoundResult
  reason: string | null
  round: number
}

interface Props {
  onBack?: () => void
}

export default function MultiplayerGame({ onBack }: Props) {
  const { room, playerNum, opponentName, markReady, leaveRoom, makeChoice } = useRoom()
  const { player } = useAuth()
  const { toast } = useToast()

  const [phase, setPhase] = useState<Phase>('choosing')
  const [resultData, setResultData] = useState<ResultData | null>(null)
  const [displayRound, setDisplayRound] = useState(room?.current_round ?? 1)
  const [localChoice, setLocalChoice] = useState<Choice | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const lastResultRound = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const initRef = useRef(false)

  function initFromRoom(r: Room, pNum: 1 | 2) {
    const curRound = r.current_round
    const curData = r.rounds[curRound - 1]

    if (curData?.result) {
      const myKey = pNum === 1 ? 'p1_choice' : 'p2_choice'
      const oppKey = pNum === 1 ? 'p2_choice' : 'p1_choice'
      const myC = curData[myKey] as Choice | undefined
      const oppC = curData[oppKey] as Choice | undefined
      if (myC && oppC) {
        lastResultRound.current = curRound
        setDisplayRound(curRound)
        setResultData({ myChoice: myC, opponentChoice: oppC, result: curData.result as RoundResult, reason: curData.reason, round: curRound })
        setPhase('result')
        setCountdown(5)
        setLocalChoice(null)
        return
      }
    }

    if (curRound > 1) {
      const prevData = r.rounds[curRound - 2]
      if (prevData?.result) {
        const myKey = pNum === 1 ? 'p1_choice' : 'p2_choice'
        const oppKey = pNum === 1 ? 'p2_choice' : 'p1_choice'
        const myC = prevData[myKey] as Choice | undefined
        const oppC = prevData[oppKey] as Choice | undefined
        if (myC && oppC) {
          lastResultRound.current = curRound - 1
          setDisplayRound(curRound - 1)
          setResultData({ myChoice: myC, opponentChoice: oppC, result: prevData.result as RoundResult, reason: prevData.reason, round: curRound - 1 })
          setPhase('result')
          setCountdown(5)
          setLocalChoice(null)
          return
        }
      }
    }

    setDisplayRound(curRound)
    setPhase('choosing')
  }

  useEffect(() => {
    if (!room || !playerNum) return

    if (!initRef.current) {
      initRef.current = true
      initFromRoom(room, playerNum)
      return
    }

    if (room.status === 'finished') {
      setPhase('finished')
      return
    }

    const curRound = room.current_round
    const round = room.rounds[curRound - 1]

    if (round?.result && lastResultRound.current !== curRound) {
      const myKey = playerNum === 1 ? 'p1_choice' : 'p2_choice'
      const oppKey = playerNum === 1 ? 'p2_choice' : 'p1_choice'
      const myC = round[myKey] as Choice | undefined
      const oppC = round[oppKey] as Choice | undefined

      if (myC && oppC) {
        lastResultRound.current = curRound
        setResultData({
          myChoice: myC, opponentChoice: oppC,
          result: round.result as RoundResult,
          reason: round.reason,
          round: curRound,
        })
        setPhase('result')
        setCountdown(5)
        setLocalChoice(null)
        setSubmitting(false)
      }
      return
    }

    if (phase === 'waiting' && curRound >= displayRound) {
      setPhase('choosing')
      setResultData(null)
    }
  }, [room, playerNum, phase, displayRound])

  useEffect(() => {
    if (phase !== 'result') return
    setCountdown(5)
    let stopped = false

    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { stopped = true; return 0 }
        return c - 1
      })
    }, 1000)
    timerRef.current = id

    return () => { stopped = true; clearInterval(id); timerRef.current = null }
  }, [phase])

  const autoNextFn = useRef(handleNextRound)
  autoNextFn.current = handleNextRound
  const prevCd = useRef(5)
  useEffect(() => {
    if (prevCd.current === 1 && countdown === 0 && phase === 'result') {
      autoNextFn.current()
    }
    prevCd.current = countdown
  })

  function handleNextRound() {
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('waiting')
    if (resultData) setDisplayRound(resultData.round + 1)
    markReady().then((err) => { if (err) toast(err, 'error') })
  }

  async function handleChoice(c: Choice) {
    if (localChoice || phase !== 'choosing') return
    setLocalChoice(c)
    setSubmitting(true)
    await makeChoice(c)
    setSubmitting(false)
  }

  function handleLeave() {
    leaveRoom()
    toast('Left the game', 'info')
    onBack?.()
  }

  if (!room || !playerNum) return null

  const opponentLabel = opponentName || 'Opponent'
  const scores = room.rounds.reduce((acc, r) => {
    if (r.result === 'p1_win') { playerNum === 1 ? acc.me++ : acc.opp++ }
    else if (r.result === 'p2_win') { playerNum === 2 ? acc.me++ : acc.opp++ }
    return acc
  }, { me: 0, opp: 0 })

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
          <p className="text-lg font-semibold text-text-soft">{phase === 'finished' ? MAX_ROUNDS : displayRound}/{MAX_ROUNDS}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted mb-1">{opponentLabel}</p>
          <p className="text-3xl font-bold text-red">{scores.opp}</p>
        </div>
      </div>

      {phase === 'finished' ? (
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
      ) : phase === 'waiting' && resultData ? (
        <div className="bg-surface-raised rounded-2xl p-8 w-full max-w-md text-center space-y-6">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-xs text-text-muted mb-2">You</p>
              <div className="text-6xl">{meta[resultData.myChoice].emoji}</div>
              <p className="text-sm text-text-soft mt-1 capitalize">{resultData.myChoice}</p>
            </div>
            <span className="text-2xl text-text-muted font-bold">VS</span>
            <div className="text-center">
              <p className="text-xs text-text-muted mb-2">{opponentLabel}</p>
              <div className="text-6xl">{meta[resultData.opponentChoice].emoji}</div>
              <p className="text-sm text-text-soft mt-1 capitalize">{resultData.opponentChoice}</p>
            </div>
          </div>

          <div className={`text-2xl font-bold py-3 px-6 rounded-xl ${
            resultData.result === 'draw' ? 'bg-yellow/20 text-yellow' :
            ((resultData.result === 'p1_win' && playerNum === 1) || (resultData.result === 'p2_win' && playerNum === 2))
              ? 'bg-green/20 text-green' : 'bg-red/20 text-red'
          }`}>
            {resultData.result === 'draw' ? "It's a Draw!" :
             ((resultData.result === 'p1_win' && playerNum === 1) || (resultData.result === 'p2_win' && playerNum === 2))
              ? 'You Won!' : `${opponentLabel} Won!`}
          </div>

          {resultData.reason && <p className="text-text-soft text-sm">{resultData.reason}</p>}

          <div className="flex items-center justify-center gap-2 text-amber mt-4">
            <span className="inline-block w-2 h-2 bg-amber rounded-full animate-pulse" />
            <span className="text-sm">Waiting for opponent to continue...</span>
          </div>
        </div>
      ) : phase === 'choosing' ? (
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
      ) : phase === 'result' && resultData ? (
        <div className="bg-surface-raised rounded-2xl p-8 w-full max-w-md text-center space-y-6 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-xs text-text-muted mb-2">You</p>
              <div className="text-6xl">{meta[resultData.myChoice].emoji}</div>
              <p className="text-sm text-text-soft mt-1 capitalize">{resultData.myChoice}</p>
            </div>
            <span className="text-2xl text-text-muted font-bold">VS</span>
            <div className="text-center">
              <p className="text-xs text-text-muted mb-2">{opponentLabel}</p>
              <div className="text-6xl">{meta[resultData.opponentChoice].emoji}</div>
              <p className="text-sm text-text-soft mt-1 capitalize">{resultData.opponentChoice}</p>
            </div>
          </div>

          <div className={`text-2xl font-bold py-3 px-6 rounded-xl ${
            resultData.result === 'draw' ? 'bg-yellow/20 text-yellow' :
            ((resultData.result === 'p1_win' && playerNum === 1) || (resultData.result === 'p2_win' && playerNum === 2))
              ? 'bg-green/20 text-green' : 'bg-red/20 text-red'
          }`}>
            {resultData.result === 'draw' ? "It's a Draw!" :
             ((resultData.result === 'p1_win' && playerNum === 1) || (resultData.result === 'p2_win' && playerNum === 2))
              ? 'You Won!' : `${opponentLabel} Won!`}
          </div>

          {resultData.reason && <p className="text-text-soft text-sm">{resultData.reason}</p>}

          <button onClick={handleNextRound}
            className="bg-indigo hover:opacity-90 px-10 py-3 rounded-xl font-semibold transition-all inline-flex items-center gap-3">
            {resultData.round < MAX_ROUNDS ? 'Next Round' : 'See Results'}
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-sm font-mono tabular-nums">{countdown}</span>
          </button>
        </div>
      ) : null}
    </div>
  )
}
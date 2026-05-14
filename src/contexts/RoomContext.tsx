import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import {
  createRoom, joinRoom, submitChoice, resolveRound, getPlayerBatch, getRoom,
} from '../lib/api'
import type { Room, Choice, RoundData, RoundResult } from '../lib/game'
import { MAX_ROUNDS, ROUND_TIME } from '../lib/constants'
import { useAuth } from './AuthContext'
import { useToast } from '../components/Toast'

interface RoomState {
  room: Room | null
  playerNum: 1 | 2 | null
  opponentName: string
  roundTimeLeft: number
  myChoice: Choice | null
  opponentChoice: Choice | null
  roundResult: RoundResult | null
  reason: string | null
}

interface RoomContextValue extends RoomState {
  createNewRoom: () => Promise<string | null>
  joinExistingRoom: (code: string) => Promise<string | null>
  leaveRoom: () => void
  makeChoice: (choice: Choice) => Promise<void>
}

const RoomContext = createContext<RoomContextValue>(null!)

export const useRoom = () => useContext(RoomContext)

const SESSION_KEY = 'rps_room'

function saveSession(roomId: string, playerNum: 1 | 2) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomId, playerNum })) } catch {}
}

function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY) } catch {}
}

function getSession(): { roomId: string; playerNum: 1 | 2 } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.roomId && (parsed?.playerNum === 1 || parsed?.playerNum === 2)) return parsed
    return null
  } catch { return null }
}

export function RoomProvider({ children }: { children: ReactNode }) {
  const { player } = useAuth()
  const { toast } = useToast()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const roomRef = useRef<Room | null>(null)
  const playerNumRef = useRef<1 | 2 | null>(null)
  const playerRef = useRef(player)

  useEffect(() => { playerRef.current = player }, [player])

  const [state, setState] = useState<RoomState>({
    room: null, playerNum: null, opponentName: '',
    roundTimeLeft: ROUND_TIME, myChoice: null,
    opponentChoice: null, roundResult: null, reason: null,
  })

  function cleanup() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const setTimer = useCallback((startedAt: string | null) => {
    if (timerRef.current) clearInterval(timerRef.current)
    const started = startedAt ? new Date(startedAt).getTime() : Date.now()

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - started) / 1000)
      const left = Math.max(0, ROUND_TIME - elapsed)
      setState((s) => ({ ...s, roundTimeLeft: left }))
    }, 200)
  }, [])

  function startPolling(roomId: string) {
    if (pollRef.current) clearInterval(pollRef.current)

    pollRef.current = setInterval(async () => {
      try {
        const updated = await getRoom(roomId)
        if (!updated) return

        roomRef.current = updated

        const pNum = playerNumRef.current
        const round = updated.rounds?.[updated.current_round - 1]
        const myChoice = round?.[pNum === 1 ? 'p1_choice' : 'p2_choice'] as Choice | null
        const oppChoice = round?.[pNum === 1 ? 'p2_choice' : 'p1_choice'] as Choice | null

        setState((s) => {
          let oppName = s.opponentName
          if (updated.status === 'playing' && pNum === 1 && updated.player2_id && !oppName) {
            getPlayerBatch([updated.player2_id]).then(([p2]) => {
              if (p2?.username) setState((s2) => ({ ...s2, opponentName: p2.username }))
            })
          }
          return {
            ...s, room: updated,
            myChoice: myChoice ?? s.myChoice,
            opponentChoice: oppChoice ?? s.opponentChoice,
            roundResult: round?.result ?? s.roundResult,
            reason: round?.reason ?? s.reason,
          }
        })

        if (updated.status === 'playing' && !timerRef.current) {
          setTimer(updated.round_started_at)
        }
      } catch { }
    }, 1000)
  }

  function subscribe(roomId: string, pNum: 1 | 2) {
    cleanup()
    setTimer(null)
    playerNumRef.current = pNum

    const channel = supabase
      .channel(`room-${roomId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        async (payload) => {
          const room = payload.new as Room
          if (!room) return
          roomRef.current = room

          const round = room.rounds?.[room.current_round - 1]
          const myChoice = round?.[pNum === 1 ? 'p1_choice' : 'p2_choice'] as Choice | null
          const oppChoice = round?.[pNum === 1 ? 'p2_choice' : 'p1_choice'] as Choice | null

          let oppName = ''
          if (room.status === 'playing' && pNum === 1) {
            const [p2] = await getPlayerBatch(room.player2_id ? [room.player2_id] : [])
            oppName = p2?.username || 'Opponent'
          }

          setState((s) => ({
            ...s, room,
            myChoice, opponentChoice: oppChoice,
            roundResult: round?.result ?? null,
            reason: round?.reason ?? null,
            opponentName: oppName || s.opponentName,
          }))

          if (room.status === 'playing') {
            setTimer(room.round_started_at)
          }
        }
      )
      .subscribe()

    channelRef.current = channel
    startPolling(roomId)
  }

  async function createNewRoom(): Promise<string | null> {
    if (!player) return 'Not logged in'
    try {
      const room = await createRoom(player.id)
      roomRef.current = room
      setState({
        room, playerNum: 1, opponentName: '', roundTimeLeft: ROUND_TIME,
        myChoice: null, opponentChoice: null, roundResult: null, reason: null,
      })
      saveSession(room.id, 1)
      subscribe(room.id, 1)
      return null
    } catch (err: any) {
      return err?.message || 'Failed to create room'
    }
  }

  async function joinExistingRoom(code: string): Promise<string | null> {
    if (!player) return 'Not logged in'
    try {
      const { room, error } = await joinRoom(code, player.id)
      if (error) return error

      cleanup()
      clearSession()
      roomRef.current = room

      const [opponent] = await getPlayerBatch([room.player1_id])
      setState({
        room, playerNum: 2, opponentName: opponent?.username || 'Opponent',
        roundTimeLeft: ROUND_TIME, myChoice: null, opponentChoice: null,
        roundResult: null, reason: null,
      })
      saveSession(room.id, 2)
      subscribe(room.id, 2)
      setTimer(room.round_started_at)
      return null
    } catch (err: any) {
      return err?.message || 'Failed to join room'
    }
  }

  function leaveRoom() {
    cleanup()
    clearSession()
    roomRef.current = null
    playerNumRef.current = null
    setState({
      room: null, playerNum: null, opponentName: '', roundTimeLeft: ROUND_TIME,
      myChoice: null, opponentChoice: null, roundResult: null, reason: null,
    })
  }

  useEffect(() => {
    const session = getSession()
    if (!session || !player) return

    ;(async () => {
      try {
        const room = await getRoom(session.roomId)
        if (!room) { clearSession(); return }

        roomRef.current = room
        const pNum = session.playerNum
        let oppName = ''
        if (room.status === 'playing' || room.status === 'finished') {
          const oppId = pNum === 1 ? room.player2_id : room.player1_id
          if (oppId) {
            const [opp] = await getPlayerBatch([oppId])
            oppName = opp?.username || 'Opponent'
          }
        }

        setState({
          room, playerNum: pNum, opponentName: oppName,
          roundTimeLeft: ROUND_TIME,
          myChoice: null, opponentChoice: null,
          roundResult: null, reason: null,
        })
        subscribe(room.id, pNum)
        if (room.status === 'playing') setTimer(room.round_started_at)
      } catch { clearSession() }
    })()
  }, [player])

  useEffect(() => {
    return () => { cleanup(); clearSession() }
  }, [])

  async function makeChoice(choice: Choice) {
    const room = roomRef.current
    const pNum = state.playerNum
    if (!room || !pNum) return

    setState((s) => ({ ...s, myChoice: choice }))
    await submitChoice(room.id, pNum, room.current_round, choice)

    const myKey = pNum === 1 ? 'p1_choice' : 'p2_choice'
    const oppKey = pNum === 1 ? 'p2_choice' : 'p1_choice'

    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 200))
      const r = roomRef.current?.rounds?.[room.current_round - 1]
      if (r?.[myKey] && r?.[oppKey]) {
        const c1 = r.p1_choice!
        const c2 = r.p2_choice!
        const isLast = room.current_round >= MAX_ROUNDS
        await resolveRound(room.id, room.current_round, c1, c2, room.current_round + 1, isLast)
        return
      }
    }
  }

  return (
    <RoomContext.Provider value={{
      ...state, createNewRoom, joinExistingRoom, leaveRoom, makeChoice,
    }}>
      {children}
    </RoomContext.Provider>
  )
}
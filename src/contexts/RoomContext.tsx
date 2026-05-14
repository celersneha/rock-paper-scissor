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

export function RoomProvider({ children }: { children: ReactNode }) {
  const { player } = useAuth()
  const { toast } = useToast()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const roomRef = useRef<Room | null>(null)

  const [state, setState] = useState<RoomState>({
    room: null, playerNum: null, opponentName: '',
    roundTimeLeft: ROUND_TIME, myChoice: null,
    opponentChoice: null, roundResult: null, reason: null,
  })

  function cleanup() {
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

  useEffect(() => {
    const room = state.room
    const pNum = state.playerNum
    if (!room || !pNum || room.status !== 'waiting') return

    const id = setInterval(async () => {
      const updated = await getRoom(room.id)
      if (!updated || updated.status !== 'playing') return

      const oppName = updated.player2_id
        ? (await getPlayerBatch([updated.player2_id]))[0]?.username || 'Opponent'
        : ''

      setState((s) => ({
        ...s, room: updated, opponentName: oppName, roundTimeLeft: ROUND_TIME,
      }))
    }, 2000)

    return () => clearInterval(id)
  }, [state.room?.id, state.room?.status, state.playerNum])

  function subscribe(roomId: string, pNum: 1 | 2) {
    cleanup()
    setTimer(null)

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
      subscribe(room.id, 1)
      return null
    } catch (err: any) {
      return err?.message || 'Failed to create room'
    }
  }

  async function joinExistingRoom(code: string): Promise<string | null> {
    if (!player) return 'Not logged in'
    cleanup()
    roomRef.current = null
    setState({
      room: null, playerNum: null, opponentName: '', roundTimeLeft: ROUND_TIME,
      myChoice: null, opponentChoice: null, roundResult: null, reason: null,
    })
    try {
      const { room, error } = await joinRoom(code, player.id)
      if (error) return error
      roomRef.current = room

      const [opponent] = await getPlayerBatch([room.player1_id])
      setState({
        room, playerNum: 2, opponentName: opponent?.username || 'Opponent',
        roundTimeLeft: ROUND_TIME, myChoice: null, opponentChoice: null,
        roundResult: null, reason: null,
      })
      subscribe(room.id, 2)
      setTimer(room.round_started_at)
      return null
    } catch (err: any) {
      return err?.message || 'Failed to join room'
    }
  }

  function leaveRoom() {
    cleanup()
    roomRef.current = null
    setState({
      room: null, playerNum: null, opponentName: '', roundTimeLeft: ROUND_TIME,
      myChoice: null, opponentChoice: null, roundResult: null, reason: null,
    })
  }

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

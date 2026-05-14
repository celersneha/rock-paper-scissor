import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import {
  createRoom, joinRoom, submitChoice, resolveRound, setPlayerReady, getPlayerBatch, getRoom,
} from '../lib/api'
import type { Room, Choice, RoundData, RoundResult } from '../lib/game'
import { MAX_ROUNDS } from '../lib/constants'
import { useAuth } from './AuthContext'
import { useToast } from '../components/Toast'

interface RoomState {
  room: Room | null
  playerNum: 1 | 2 | null
  opponentName: string
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
  markReady: () => Promise<string | null>
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const roomRef = useRef<Room | null>(null)
  const playerNumRef = useRef<1 | 2 | null>(null)

  const [state, setState] = useState<RoomState>({
    room: null, playerNum: null, opponentName: '',
    myChoice: null, opponentChoice: null, roundResult: null, reason: null,
  })

  function cleanup() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    if (channelRef.current) { supabase.removeChannel(channelRef.current); channelRef.current = null }
  }

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

        if (updated.status === 'playing' && pNum === 1 && updated.player2_id) {
          getPlayerBatch([updated.player2_id]).then(([p2]) => {
            if (p2?.username) setState((s) => ({ ...s, opponentName: p2.username }))
          })
        }

        setState((s) => ({
          ...s, room: updated,
          myChoice: myChoice ?? s.myChoice,
          opponentChoice: oppChoice ?? s.opponentChoice,
          roundResult: round?.result ?? s.roundResult,
          reason: round?.reason ?? s.reason,
        }))

      } catch { }
    }, 1000)
  }

  function subscribe(roomId: string, pNum: 1 | 2) {
    cleanup()
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
        room, playerNum: 1, opponentName: '',
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
        myChoice: null, opponentChoice: null,
        roundResult: null, reason: null,
      })
      saveSession(room.id, 2)
      subscribe(room.id, 2)
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
      room: null, playerNum: null, opponentName: '',
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
          myChoice: null, opponentChoice: null,
          roundResult: null, reason: null,
        })
        subscribe(room.id, pNum)
      } catch { clearSession() }
    })()
  }, [player])

  useEffect(() => {
    return () => { cleanup() }
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
      const cur = roomRef.current
      if (!cur) return
      const r = cur.rounds?.[cur.current_round - 1]
      if (r?.[myKey] && r?.[oppKey]) {
        const c1 = r.p1_choice!
        const c2 = r.p2_choice!
        await resolveRound(cur.id, cur.current_round, c1, c2)
        return
      }
    }
  }

  async function markReady(): Promise<string | null> {
    const room = roomRef.current
    const pNum = state.playerNum
    if (!room || !pNum) return 'No active room'
    try {
      await setPlayerReady(room.id, pNum)
      return null
    } catch (err: any) {
      return err?.message || 'Failed to set ready'
    }
  }

  return (
    <RoomContext.Provider value={{
      ...state, createNewRoom, joinExistingRoom, leaveRoom, makeChoice, markReady,
    }}>
      {children}
    </RoomContext.Provider>
  )
}
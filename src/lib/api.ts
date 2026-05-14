import axios from 'axios'
import { SUPABASE_URL, SUPABASE_ANON_KEY, REQUEST_TIMEOUT } from './constants'
import { supabase } from './supabase'
import { getRoundResult, getReason, type Room, type RoundData, type Choice } from './game'

export interface Player {
  id: string
  email: string
  username: string
  created_at: string
}

const api = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  timeout: REQUEST_TIMEOUT,
})

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export async function getPlayer(userId: string): Promise<Player | null> {
  const { data } = await api.get<Player[]>('/players', {
    params: { id: `eq.${userId}`, select: '*' },
  })
  return data?.[0] ?? null
}

export async function createPlayer(userId: string, email: string, username: string): Promise<Player> {
  const { data } = await api.post<Player[]>('/players', { id: userId, email, username })
  return data[0]
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data } = await supabase.rpc('check_username_available', { username })
  return data as boolean
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createRoom(playerId: string): Promise<Room> {
  let code: string
  for (let attempt = 0; attempt < 10; attempt++) {
    code = generateRoomCode()
    const { data: existing } = await api.get<Room[]>('/rooms', {
      params: { code: `eq.${code}`, select: 'id', limit: 1 },
    })
    if (!existing?.length) break
  }
  const code2 = code!

  const rounds: RoundData[] = Array.from({ length: 5 }, (_, i) => ({
    round: i + 1, p1_choice: null, p2_choice: null, result: null, reason: null,
  }))

  const { data } = await api.post<Room[]>('/rooms', {
    code: code2, player1_id: playerId, rounds, status: 'waiting', current_round: 1,
  })
  return data[0]
}

export async function joinRoom(code: string, playerId: string): Promise<{ room: Room; error?: string }> {
  const { data: rooms } = await api.get<Room[]>('/rooms', {
    params: { code: `eq.${code}`, select: '*' },
  })
  if (!rooms?.length) return { room: null!, error: 'Room not found' }
  const room = rooms[0]
  if (room.status !== 'waiting') return { room: null!, error: 'Room is already full or in progress' }
  if (room.player1_id === playerId) return { room: null!, error: 'You cannot join your own room' }

  const { data } = await api.patch<Room[]>('/rooms', {
    player2_id: playerId,
    status: 'playing',
    round_started_at: new Date().toISOString(),
  }, { params: { id: `eq.${room.id}` } })

  return { room: data[0] }
}

export async function submitChoice(roomId: string, playerNum: 1 | 2, round: number, choice: Choice): Promise<void> {
  const field = playerNum === 1 ? 'p1_choice' : 'p2_choice'

  const { data: current } = await api.get<Room[]>('/rooms', {
    params: { id: `eq.${roomId}`, select: 'rounds' },
  })
  if (!current?.length) return

  const rounds = [...current[0].rounds as RoundData[]]
  rounds[round - 1] = { ...rounds[round - 1], [field]: choice }

  await api.patch('/rooms', { rounds }, { params: { id: `eq.${roomId}` } })
}

export async function resolveRound(roomId: string, round: number, choice1: Choice, choice2: Choice, nextRound: number, isLast: boolean): Promise<void> {
  const result = getRoundResult(choice1, choice2)
  const reason = getReason(choice1, choice2)

  const { data: current } = await api.get<Room[]>('/rooms', {
    params: { id: `eq.${roomId}`, select: 'rounds' },
  })
  if (!current?.length) return

  const rounds = [...current[0].rounds as RoundData[]]
  rounds[round - 1] = {
    ...rounds[round - 1],
    p1_choice: choice1,
    p2_choice: choice2,
    result,
    reason,
  }

  const update: Record<string, unknown> = { rounds }
  if (result === 'p1_win') update.winner_id = current[0].player1_id
  else if (result === 'p2_win') update.winner_id = current[0].player2_id

  if (isLast) {
    update.status = 'finished'
  } else {
    update.current_round = nextRound
    update.round_started_at = new Date().toISOString()
    update.p1_ready = false
    update.p2_ready = false
  }

  await api.patch('/rooms', update, { params: { id: `eq.${roomId}` } })
}

export async function markRoundReady(roomId: string, playerNum: 1 | 2): Promise<void> {
  const field = playerNum === 1 ? 'p1_ready' : 'p2_ready'
  await api.patch('/rooms', { [field]: true }, { params: { id: `eq.${roomId}` } })
}

export async function getPlayerBatch(ids: string[]): Promise<Player[]> {
  if (!ids.length) return []
  const { data } = await api.get<Player[]>('/players', {
    params: { id: `in.(${ids.join(',')})`, select: 'id,username' },
  })
  return data ?? []
}

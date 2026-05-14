import axios from 'axios'
import { SUPABASE_URL, SUPABASE_ANON_KEY, REQUEST_TIMEOUT } from './constants'
import { supabase } from './supabase'

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

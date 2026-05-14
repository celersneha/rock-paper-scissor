import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gmxeymecpxsdcemimnjl.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdteGV5bWVjcHhzZGNlbWltbmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3NTU1NzAsImV4cCI6MjA5NDMzMTU3MH0.0ytKJA5md0wo1EQQ0FUo0xftrFDrCSf6s8xL1SaTs34'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Player {
  id: string
  email: string
  username: string
  created_at: string
}

export class ApiError extends Error {
  constructor(message: string, public original?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
}

async function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new ApiError('Request timed out')), ms)
  )
  return Promise.race([promise, timeout])
}

export async function getPlayer(userId: string): Promise<Player | null> {
  try {
    const { data, error } = await withTimeout(
      supabase.from('players').select('*').eq('id', userId).single()
    )
    if (error && error.code !== 'PGRST116') throw new ApiError(error.message, error)
    return data
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError('Failed to load player data')
  }
}

export async function createPlayer(
  userId: string,
  email: string,
  username: string
): Promise<Player> {
  try {
    const { data, error } = await withTimeout(
      supabase.from('players').insert({ id: userId, email, username }).select().single()
    )
    if (error) throw new ApiError(error.message, error)
    return data
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError('Failed to create player')
  }
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  try {
    const { data, error } = await withTimeout(
      supabase.rpc('check_username_available', { username })
    )
    if (error) throw new ApiError(error.message, error)
    return data as boolean
  } catch (err) {
    if (err instanceof ApiError) throw err
    throw new ApiError('Failed to check username')
  }
}

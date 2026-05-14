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

export async function getPlayer(userId: string): Promise<Player | null> {
  const { data } = await supabase
    .from('players')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function createPlayer(
  userId: string,
  email: string,
  username: string
): Promise<Player> {
  const { data, error } = await supabase
    .from('players')
    .insert({ id: userId, email, username })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const { count } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('username', username)
  return (count ?? 0) > 0
}

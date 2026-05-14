import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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

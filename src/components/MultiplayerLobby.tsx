import { useState, type FormEvent } from 'react'
import { useRoom } from '../contexts/RoomContext'
import { useToast } from './Toast'

interface Props {
  onBack: () => void
}

export default function MultiplayerLobby({ onBack }: Props) {
  const { room, createNewRoom, joinExistingRoom, leaveRoom } = useRoom()
  const { toast } = useToast()
  const [joinCode, setJoinCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate() {
    setSubmitting(true)
    const err = await createNewRoom()
    setSubmitting(false)
    if (err) toast(err, 'error')
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    if (joinCode.trim().length < 4) return toast('Enter a valid room code', 'error')
    setSubmitting(true)
    const err = await joinExistingRoom(joinCode.trim().toUpperCase())
    setSubmitting(false)
    if (err) toast(err, 'error')
  }

  if (room) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md text-center space-y-6">
          <h2 className="text-2xl font-bold">Room Created</h2>
          <div className="bg-gray-800 rounded-xl py-6">
            <p className="text-xs text-gray-500 mb-2">Share this code</p>
            <p className="text-5xl font-mono font-bold tracking-[0.3em] text-amber-400">{room.code}</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-yellow-400">
            <span className="inline-block w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
            Waiting for opponent...
          </div>
          <button onClick={leaveRoom}
            className="bg-gray-800 hover:bg-gray-700 px-6 py-2 rounded-lg text-sm">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md space-y-8">
        <h2 className="text-2xl font-bold text-center">Multiplayer</h2>

        <button onClick={handleCreate} disabled={submitting}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl py-4 text-lg font-semibold transition-colors">
          {submitting ? 'Creating...' : 'Create Room'}
        </button>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-800" />
          <span className="text-gray-500 text-sm">OR</span>
          <span className="h-px flex-1 bg-gray-800" />
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <input type="text" placeholder="Enter room code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={6} autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-[0.2em] text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 uppercase"
          />
          <button type="submit" disabled={submitting || joinCode.trim().length < 4}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl py-4 text-lg font-semibold transition-colors">
            {submitting ? 'Joining...' : 'Join Room'}
          </button>
        </form>

        <button onClick={onBack} className="w-full text-gray-500 hover:text-gray-300 text-sm transition-colors">← Back</button>
      </div>
    </div>
  )
}

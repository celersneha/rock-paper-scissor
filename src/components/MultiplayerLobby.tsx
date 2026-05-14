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

  const joinForm = (
    <form onSubmit={handleJoin} className="space-y-4">
      <input
        type="text"
        placeholder="Room code"
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
        maxLength={6}
        autoFocus={!room}
        className="w-full bg-surface-over rounded-xl px-4 py-3 text-center text-2xl font-mono tracking-[0.2em] text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-indigo/50 uppercase"
      />
      <button type="submit" disabled={submitting || joinCode.trim().length < 4}
        className="w-full bg-emerald hover:opacity-90 disabled:opacity-40 rounded-xl py-4 text-lg font-semibold transition-all">
        {submitting ? 'Joining...' : 'Join Room'}
      </button>
    </form>
  )

  if (room) {
    return (
      <div className="min-h-screen bg-surface text-text flex flex-col items-center justify-center p-4">
        <div className="bg-surface-raised rounded-2xl p-8 w-full max-w-sm text-center space-y-6">
          <h2 className="text-2xl font-bold">Room Created</h2>
          <div className="bg-surface-over rounded-xl py-6">
            <p className="text-xs text-text-muted mb-2">Share this code</p>
            <p className="text-5xl font-mono font-bold tracking-[0.3em] text-amber">{room.code}</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-amber">
            <span className="inline-block w-2 h-2 bg-amber rounded-full animate-pulse" />
            Waiting for opponent...
          </div>
          <button onClick={leaveRoom} className="bg-surface-hover hover:opacity-80 px-6 py-2 rounded-xl text-sm transition-all">Cancel</button>

          <div className="flex items-center gap-3 pt-4">
            <span className="h-px flex-1 bg-line" />
            <span className="text-text-soft text-sm">OR join another</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          {joinForm}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface text-text flex flex-col items-center justify-center p-4">
      <div className="bg-surface-raised rounded-2xl p-8 w-full max-w-sm space-y-8">
        <h2 className="text-2xl font-bold text-center">Multiplayer</h2>

        <button onClick={handleCreate} disabled={submitting}
          className="w-full bg-indigo hover:opacity-90 disabled:opacity-40 rounded-xl py-4 text-lg font-semibold transition-all">
          {submitting ? 'Creating...' : 'Create Room'}
        </button>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-text-soft text-sm">OR</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        {joinForm}

        <button onClick={onBack} className="w-full text-text-soft hover:text-text text-sm transition-colors">← Back</button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { RoomProvider } from './contexts/RoomContext'
import { ToastProvider } from './components/Toast'
import AuthForm from './components/AuthForm'
import UsernameSetup from './components/UsernameSetup'
import ModeSelect from './components/ModeSelect'
import SingleplayerGame from './components/SingleplayerGame'
import MultiplayerLobby from './components/MultiplayerLobby'
import MultiplayerGame from './components/MultiplayerGame'
import { useRoom } from './contexts/RoomContext'

function GameRouter() {
  const { user, player, loading } = useAuth()

  if (loading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center"><p className="text-gray-500 text-lg">Loading...</p></div>
  if (!user) return <AuthForm />
  if (!player) return <UsernameSetup />
  return <ModeSelectRouter />
}

function ModeSelectRouter() {
  const [mode, setMode] = useState<'select' | 'singleplayer' | 'multiplayer'>('select')

  if (mode === 'singleplayer') return <SingleplayerGame />

  if (mode === 'multiplayer') {
    return (
      <RoomProvider>
        <MultiplayerRouter onBack={() => setMode('select')} />
      </RoomProvider>
    )
  }

  return <ModeSelect onSelect={setMode} />
}

function MultiplayerRouter({ onBack }: { onBack: () => void }) {
  const { room } = useRoom()

  if (room && (room.status === 'playing' || room.status === 'finished')) {
    return <MultiplayerGame />
  }

  if (room) {
    return <MultiplayerLobby onBack={onBack} />
  }

  return <MultiplayerLobby onBack={onBack} />
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <GameRouter />
      </AuthProvider>
    </ToastProvider>
  )
}

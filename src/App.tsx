import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import AuthForm from './components/AuthForm'
import UsernameSetup from './components/UsernameSetup'
import Game from './components/Game'

function Screen() {
  const { user, player, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center"><p className="text-gray-500 text-lg">Loading...</p></div>
  if (!user) return <AuthForm />
  if (!player) return <UsernameSetup />
  return <Game />
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Screen />
      </AuthProvider>
    </ToastProvider>
  )
}

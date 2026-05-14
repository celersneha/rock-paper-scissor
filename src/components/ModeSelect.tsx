import { useAuth } from '../contexts/AuthContext'

interface Props {
  onSelect: (mode: 'singleplayer' | 'multiplayer') => void
}

export default function ModeSelect({ onSelect }: Props) {
  const { player, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <span className="text-sm text-indigo-400 font-medium">{player?.username}</span>
        <button onClick={signOut} className="bg-gray-800 hover:bg-gray-700 text-sm px-4 py-2 rounded-lg">Logout</button>
      </div>

      <h1 className="text-5xl font-extrabold mb-2 tracking-tight">
        Rock <span className="text-amber-400">Paper</span> Scissors
      </h1>
      <p className="text-gray-500 mb-12">Choose a game mode</p>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
        <button onClick={() => onSelect('singleplayer')}
          className="flex-1 bg-gray-900 border border-gray-800 hover:border-indigo-500 rounded-2xl p-8 text-center transition-all hover:scale-105 group">
          <span className="text-6xl block mb-4">👤</span>
          <h2 className="text-2xl font-bold mb-2">Singleplayer</h2>
          <p className="text-gray-500 text-sm">Play against the computer</p>
        </button>

        <button onClick={() => onSelect('multiplayer')}
          className="flex-1 bg-gray-900 border border-gray-800 hover:border-emerald-500 rounded-2xl p-8 text-center transition-all hover:scale-105 group">
          <span className="text-6xl block mb-4">👥</span>
          <h2 className="text-2xl font-bold mb-2">Multiplayer</h2>
          <p className="text-gray-500 text-sm">Play against a friend in real-time</p>
        </button>
      </div>
    </div>
  )
}

import { useAuth } from '../contexts/AuthContext'

interface Props {
  onSelect: (mode: 'singleplayer' | 'multiplayer') => void
}

export default function ModeSelect({ onSelect }: Props) {
  const { player, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-surface text-text flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-3">
        <span className="text-sm text-text-soft">{player?.username}</span>
        <button onClick={signOut} className="bg-surface-hover hover:opacity-80 text-sm px-4 py-2 rounded-xl transition-all">Logout</button>
      </div>

      <h1 className="text-5xl font-extrabold mb-2 tracking-tight">
        Rock <span className="text-amber">Paper</span> Scissors
      </h1>
      <p className="text-text-soft mb-12">Choose a game mode</p>

      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-lg">
        <button onClick={() => onSelect('singleplayer')}
          className="flex-1 bg-surface-raised hover:bg-surface-hover rounded-2xl p-8 text-center transition-all hover:scale-[1.03] group">
          <span className="text-5xl block mb-4">👤</span>
          <h2 className="text-xl font-bold mb-1">Singleplayer</h2>
          <p className="text-text-soft text-sm">Play against the computer</p>
        </button>

        <button onClick={() => onSelect('multiplayer')}
          className="flex-1 bg-surface-raised hover:bg-surface-hover rounded-2xl p-8 text-center transition-all hover:scale-[1.03] group">
          <span className="text-5xl block mb-4">👥</span>
          <h2 className="text-xl font-bold mb-1">Multiplayer</h2>
          <p className="text-text-soft text-sm">Play against a friend</p>
        </button>
      </div>
    </div>
  )
}

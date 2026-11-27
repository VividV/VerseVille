import { Link } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'
import { SettingsIcon } from './icons'

function Resource({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 shadow-soft" aria-label={`${value} ${label}`}>
      <span aria-hidden="true">{icon}</span>
      <span className="font-extrabold tabular-nums text-ink" aria-hidden="true">
        {value}
      </span>
    </div>
  )
}

export function TopResourceBar() {
  const resources = useGameStore((s) => s.resources)
  if (!resources) return null

  return (
    <header className="sticky top-0 z-30 bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-2 px-3 py-2">
        <div
          className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full bg-leaf text-white shadow-soft"
          aria-label={`Level ${resources.level}`}
        >
          <span className="text-[0.55rem] font-bold uppercase leading-none" aria-hidden="true">
            Lvl
          </span>
          <span className="text-lg font-extrabold leading-none" aria-hidden="true">
            {resources.level}
          </span>
        </div>
        <Resource icon="⭐" value={resources.xp} label="XP" />
        <Resource icon="🪙" value={resources.coins} label="coins" />
        <Resource icon="🌰" value={resources.seeds} label="seeds" />
        <Link
          to="/profile"
          aria-label="Settings"
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-leaf-dark hover:bg-leaf-light"
        >
          <SettingsIcon />
        </Link>
      </div>
    </header>
  )
}

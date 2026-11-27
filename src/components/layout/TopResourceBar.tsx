import { Link } from 'react-router-dom'
import { useGameStore } from '../../store/gameStore'
import { SettingsIcon } from './icons'
import { levelProgress } from '../../engine/progression/playerLevel'
import { ProgressBar } from '../common/ProgressBar'

function Resource({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    // key={value} restarts the bump animation whenever the amount changes.
    <div key={value} className="flex items-center gap-1 rounded-full bg-cream px-2.5 py-1 shadow-soft animate-bump">
      <span className="sr-only">
        {value} {label}
      </span>
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
  const { xpIntoLevel, xpNeeded } = levelProgress(resources.xp)

  return (
    <header className="sticky top-0 z-30 bg-paper/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-2 px-3 py-2">
        <div
          className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full bg-leaf text-white shadow-soft"
        >
          <span className="sr-only">Level {resources.level}</span>
          <span className="text-[0.6rem] font-extrabold uppercase leading-none" aria-hidden="true">
            Lvl
          </span>
          <span className="text-lg font-extrabold leading-none" aria-hidden="true">
            {resources.level}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <span className="sr-only">
            {xpIntoLevel} of {xpNeeded} XP to level {resources.level + 1}
          </span>
          <div className="flex justify-between text-[0.65rem] font-extrabold text-ink-soft" aria-hidden="true">
            <span>XP</span>
            <span className="tabular-nums">
              {xpIntoLevel}/{xpNeeded}
            </span>
          </div>
          <ProgressBar value={xpIntoLevel} max={xpNeeded} label="Experience to next level" tone="gold" />
        </div>
        <Resource icon="🪙" value={resources.coins} label="coins" />
        <Resource icon="🌰" value={resources.seeds} label="seeds" />
        <Link
          to="/profile"
          aria-label="Settings"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-leaf-dark hover:bg-leaf-light"
        >
          <SettingsIcon />
        </Link>
      </div>
    </header>
  )
}

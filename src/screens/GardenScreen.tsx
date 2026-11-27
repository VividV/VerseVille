import { Link } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { GardenBackdrop } from '../components/common/GardenBackdrop'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'

export function GardenScreen() {
  const profile = useGameStore((s) => s.profile)
  const dailyGoal = useSettingsStore((s) => s.settings.dailyGoal)

  return (
    <div className="flex flex-col gap-4 animate-pop-in">
      <h1 className="text-2xl font-extrabold text-leaf-dark">Welcome back, {profile?.displayName}</h1>

      <div className="overflow-hidden rounded-card shadow-soft">
        <GardenBackdrop className="block h-auto w-full" />
      </div>

      <Card>
        <h2 className="text-lg font-extrabold text-leaf-dark">Today's Scripture Journey</h2>
        <p className="mt-1 text-ink-soft">
          Your daily goal is <strong className="text-ink">{dailyGoal}</strong>{' '}
          {dailyGoal === 1 ? 'scripture' : 'scriptures'}. Pick a verse to start learning. Your
          interactive garden is being planted next.
        </p>
        <Link
          to="/scriptures"
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-leaf px-5 font-bold text-white shadow-soft hover:bg-leaf-dark"
        >
          Browse scriptures
        </Link>
      </Card>
    </div>
  )
}

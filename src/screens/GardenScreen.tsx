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
          {dailyGoal === 1 ? 'scripture' : 'scriptures'}. Scripture learning and the interactive garden are being
          planted next.
        </p>
      </Card>
    </div>
  )
}

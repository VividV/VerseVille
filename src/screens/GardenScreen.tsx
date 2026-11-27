import { Link } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { GardenBackdrop } from '../components/common/GardenBackdrop'
import { getDueReviews, getNextActivity } from '../engine/memorisation/reviewQueue'
import { getScriptures } from '../engine/scripture/scriptureCatalog'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import { nextActivityPath } from './nextActivity'

const REASON_TEXT = {
  review: 'Due for review',
  continue: 'Pick up where you left off',
  new: 'A new verse to learn',
} as const

export function GardenScreen() {
  const profile = useGameStore((s) => s.profile)
  const progressById = useGameStore((s) => s.scriptureProgress)
  const { dailyGoal, preferredTranslation } = useSettingsStore((s) => s.settings)

  const now = new Date()
  const dueCount = getDueReviews(progressById, now).length
  const next = getNextActivity(getScriptures(preferredTranslation), progressById, now)

  return (
    <div className="flex flex-col gap-4 animate-pop-in">
      <h1 className="text-2xl font-extrabold text-leaf-dark">Welcome back, {profile?.displayName}</h1>

      <div className="overflow-hidden rounded-card shadow-soft">
        <GardenBackdrop className="block h-auto w-full" />
      </div>

      <Card>
        <h2 className="text-lg font-extrabold text-leaf-dark">Today's Scripture Journey</h2>
        <p className="mt-1 text-ink-soft">
          {dueCount > 0 ? (
            <>
              <strong className="text-ink">{dueCount}</strong> {dueCount === 1 ? 'verse is' : 'verses are'} ready for
              review.{' '}
            </>
          ) : (
            'No reviews due right now. '
          )}
          Your daily goal is <strong className="text-ink">{dailyGoal}</strong> {dailyGoal === 1 ? 'scripture' : 'scriptures'}.
        </p>

        {next ? (
          <Link
            to={nextActivityPath(next)}
            className="mt-3 flex min-h-14 w-full items-center justify-between gap-3 rounded-full bg-leaf px-5 text-white shadow-soft hover:bg-leaf-dark"
          >
            <span className="flex flex-col leading-tight">
              <span className="text-lg font-extrabold">Continue Learning</span>
              <span className="text-sm text-white/90">
                {REASON_TEXT[next.reason]}: {next.scripture.reference}
              </span>
            </span>
            <span aria-hidden="true" className="text-xl">
              →
            </span>
          </Link>
        ) : (
          <p className="mt-3 font-bold text-leaf-dark">You've started every verse and nothing is due. Well done!</p>
        )}
        <Link
          to="/scriptures"
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full font-bold text-leaf-dark hover:bg-leaf-light"
        >
          Browse all scriptures
        </Link>
      </Card>
    </div>
  )
}

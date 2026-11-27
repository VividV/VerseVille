import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { LoadingState } from '../components/common/LoadingState'
import { ProgressBar } from '../components/common/ProgressBar'
import { computeProgressStats, gardenStage, RECALL_WINDOW_DAYS } from '../engine/progression/progressStats'
import { levelProgress, levelTitle } from '../engine/progression/playerLevel'
import { loadGameSessions } from '../services/persistence/saveService'
import { useGameStore } from '../store/gameStore'
import { useGardenStore } from '../store/gardenStore'
import { useQuestStore } from '../store/questStore'
import type { GameSession } from '../types/games'

function Stat({ value, label, icon }: { value: string | number; label: string; icon: string }) {
  return (
    <div className="flex flex-col items-center rounded-card bg-cream p-3 text-center shadow-soft">
      <span className="text-2xl" aria-hidden="true">
        {icon}
      </span>
      <span className="text-2xl font-extrabold text-leaf-dark">{value}</span>
      <span className="text-xs font-bold text-ink-soft">{label}</span>
    </div>
  )
}

/** Spec Screen 14. The headline is long-term recall, not time played. */
export function ProgressScreen() {
  const progress = useGameStore((s) => s.scriptureProgress)
  const resources = useGameStore((s) => s.resources)
  const days = useQuestStore((s) => s.days)
  const { items, expansionsUnlocked } = useGardenStore()
  const [sessions, setSessions] = useState<GameSession[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    loadGameSessions()
      .then(setSessions)
      .catch(() => setError(true))
  }, [])

  if (!resources) return null
  if (!sessions && !error) return <LoadingState message="Gathering your progress…" />

  const stats = computeProgressStats({ progress, sessions: sessions ?? [], days, now: new Date() })
  const level = levelProgress(resources.xp)
  const stage = gardenStage(items.length, expansionsUnlocked)

  return (
    <div className="flex flex-col gap-4 animate-pop-in">
      <Link to="/profile" className="-ml-1 inline-flex min-h-11 items-center gap-1 font-bold text-leaf-dark">
        <span aria-hidden="true">←</span> Profile
      </Link>
      <h1 className="text-2xl font-extrabold text-leaf-dark">My Progress</h1>

      <Card className="text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">Verses you can recall</p>
        <p className="text-5xl font-extrabold text-leaf-dark">{stats.versesYouCanRecall}</p>
        <p className="text-sm text-ink-soft">Strong or mastered — remembered without help</p>
        <p className="mt-3 text-sm text-ink-soft">
          Recall accuracy (last {RECALL_WINDOW_DAYS} days):{' '}
          <strong className="text-ink">
            {stats.recallAccuracy === null ? 'no recalls yet' : `${Math.round(stats.recallAccuracy * 100)}%`}
          </strong>
          {stats.recallAttempts > 0 && ` over ${stats.recallAttempts} ${stats.recallAttempts === 1 ? 'recall' : 'recalls'}`}
        </p>
      </Card>

      {error && <p className="text-center text-sm text-ink-soft">Some history couldn't be loaded.</p>}

      <div className="grid grid-cols-2 gap-3">
        <Stat icon="🌱" value={stats.learned} label="Scriptures learned" />
        <Stat icon="🌟" value={stats.mastered} label="Scriptures mastered" />
        <Stat icon="💧" value={stats.reviewsCompleted} label="Reviews completed" />
        <Stat icon="🔥" value={stats.streak} label={stats.streak === 1 ? 'Day streak' : 'Days in a row'} />
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-leaf-dark">
            Level {resources.level} · {levelTitle(resources.level)}
          </h2>
          <span className="text-sm font-bold text-ink-soft">{resources.xp} XP total</span>
        </div>
        <ProgressBar value={level.xpIntoLevel} max={level.xpNeeded} label="Experience to next level" tone="gold" className="mt-2" />
        <p className="mt-1 text-sm text-ink-soft">
          {level.xpNeeded - level.xpIntoLevel} XP to level {resources.level + 1}
        </p>
      </Card>

      <Card className="flex items-center gap-3">
        <span className="text-4xl" aria-hidden="true">
          {stage.icon}
        </span>
        <div>
          <h2 className="text-lg font-extrabold text-leaf-dark">Garden stage: {stage.name}</h2>
          <p className="text-sm text-ink-soft">
            {items.length} items placed · {expansionsUnlocked} of 3 land expansions
          </p>
        </div>
      </Card>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { DailyQuestCard } from '../components/quests/DailyQuestCard'
import { QuestProgress } from '../components/quests/QuestProgress'
import { DAILY_GOAL_SEEDS, canClaim } from '../engine/quests/questEngine'
import { todayKey, useQuestStore } from '../store/questStore'
import { useSettingsStore } from '../store/settingsStore'

export function DailyQuestsScreen() {
  const { quests, days, ensureQuestsFor, claimQuest } = useQuestStore()
  const dailyGoal = useSettingsStore((s) => s.settings.dailyGoal)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const today = todayKey()

  // A new day may have started since the app was opened.
  useEffect(() => {
    void ensureQuestsFor(today)
  }, [ensureQuestsFor, today])

  const todays = quests.filter((q) => q.questDate === today)
  const earlierUnclaimed = quests.filter((q) => q.questDate < today && canClaim(q))
  const day = days[today]
  const studied = day?.studiedScriptureIds.length ?? 0
  const goalDone = Boolean(day?.goalCompletedAt)

  const claim = async (id: string) => {
    setBusyId(id)
    try {
      await claimQuest(id)
      setMessage('Reward claimed! Keep growing.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not claim that.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 animate-pop-in">
      <h1 className="text-2xl font-extrabold text-leaf-dark">Daily Quests</h1>

      <Card>
        <h2 className="text-lg font-extrabold text-leaf-dark">Daily goal progress</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Study {dailyGoal} {dailyGoal === 1 ? 'scripture' : 'different scriptures'} today with a successful game (60%+). Earns{' '}
          {DAILY_GOAL_SEEDS} seed <span aria-hidden="true">🌰</span>.
        </p>
        <div className="mt-2">
          <QuestProgress progress={Math.min(studied, dailyGoal)} target={dailyGoal} label="Daily goal progress" />
        </div>
        {goalDone ? (
          <p className="mt-2 font-extrabold text-leaf-dark">🎉 Goal complete for today!</p>
        ) : (
          <Link to="/garden" className="mt-3 inline-flex min-h-11 items-center font-bold text-leaf-dark underline">
            Go to Continue Learning
          </Link>
        )}
      </Card>

      {message && (
        <p role="status" className="rounded-2xl bg-leaf-light px-4 py-2 text-center font-bold text-leaf-dark">
          {message}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {todays.map((q) => (
          <li key={q.id}>
            <DailyQuestCard quest={q} onClaim={() => claim(q.id)} busy={busyId === q.id} />
          </li>
        ))}
      </ul>

      {earlierUnclaimed.length > 0 && (
        <section aria-labelledby="earlier-heading">
          <h2 id="earlier-heading" className="mb-2 text-lg font-extrabold text-leaf-dark">
            Unclaimed from earlier days
          </h2>
          <ul className="flex flex-col gap-3">
            {earlierUnclaimed.map((q) => (
              <li key={q.id}>
                <DailyQuestCard quest={q} onClaim={() => claim(q.id)} busy={busyId === q.id} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-center text-sm text-ink-soft">New quests arrive each day at midnight, your time.</p>
    </div>
  )
}

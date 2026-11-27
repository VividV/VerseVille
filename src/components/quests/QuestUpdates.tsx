import { Link } from 'react-router-dom'
import type { CompletedGame } from '../../store/gameStore'
import { getQuest } from '../../engine/quests/questEngine'
import { QuestProgress } from './QuestProgress'

/** After a game: daily goal progress and any quests just completed. */
export function QuestUpdates({ game, dailyGoal }: { game: CompletedGame; dailyGoal: number }) {
  const studied = Math.min(game.day.studiedScriptureIds.length, dailyGoal)
  return (
    <section aria-labelledby="quest-updates-heading" className="rounded-card bg-cream p-4 shadow-soft">
      <h2 id="quest-updates-heading" className="text-lg font-extrabold text-leaf-dark">
        Today's goal
      </h2>
      <div className="mt-2">
        <QuestProgress progress={studied} target={dailyGoal} label="Daily goal progress" />
      </div>
      {game.dailyGoalJustCompleted && (
        <p className="mt-2 font-extrabold text-leaf-dark animate-pop-in">🎉 Daily goal complete! +1 seed</p>
      )}
      {game.questsCompleted.length > 0 && (
        <div className="mt-3 rounded-2xl bg-gold/30 p-3">
          {game.questsCompleted.map((q) => (
            <p key={q.id} className="font-bold text-ink">
              <span aria-hidden="true">{getQuest(q.questId)?.icon}</span> Quest complete: {getQuest(q.questId)?.name}
            </p>
          ))}
          <Link to="/quests" className="mt-1 inline-flex min-h-11 items-center font-extrabold text-leaf-dark underline">
            Claim your reward in Quests
          </Link>
        </div>
      )}
    </section>
  )
}

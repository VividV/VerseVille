import type { DailyQuest } from '../../types/quests'
import { canClaim, getQuest } from '../../engine/quests/questEngine'
import { Button } from '../common/Button'
import { QuestProgress } from './QuestProgress'

export function DailyQuestCard({ quest, onClaim, busy }: { quest: DailyQuest; onClaim: () => void; busy: boolean }) {
  const def = getQuest(quest.questId)
  if (!def) return null
  const done = quest.completedAt !== null
  return (
    <article className={`rounded-card p-4 shadow-soft ${done ? 'bg-leaf-light' : 'bg-cream'}`} aria-label={def.name}>
      <div className="flex items-start gap-3">
        <span className="text-3xl" aria-hidden="true">
          {def.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-leaf-dark">{def.name}</h2>
          <p className="text-sm text-ink-soft">{def.description}</p>
          <div className="mt-2">
            <QuestProgress progress={quest.progress} target={quest.target} label={`${def.name} progress`} />
          </div>
          <p className="mt-2 flex gap-3 text-sm font-bold text-ink">
            <span>
              <span aria-hidden="true">⭐</span> {def.xpReward} <span className="sr-only">XP</span>
            </span>
            <span>
              <span aria-hidden="true">🪙</span> {def.coinReward} <span className="sr-only">coins</span>
            </span>
          </p>
        </div>
      </div>
      {canClaim(quest) && (
        <Button variant="gold" fullWidth className="mt-3" onClick={onClaim} disabled={busy}>
          Claim reward
        </Button>
      )}
      {quest.rewardClaimed && <p className="mt-3 text-center text-sm font-extrabold text-leaf-dark">✓ Reward claimed</p>}
      {done && !quest.rewardClaimed && <span className="sr-only">Complete</span>}
    </article>
  )
}

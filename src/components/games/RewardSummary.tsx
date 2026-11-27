import type { RewardTransaction } from '../../types/rewards'
import type { RewardSkipReason } from '../../engine/rewards/rewardCalculator'
import { sumTransactions } from '../../engine/rewards/economy'

const SKIP_MESSAGES: Record<RewardSkipReason, string> = {
  'already-earned-today':
    "You've already earned today's reward for this activity on this verse. Practice still grows your memory!",
  'daily-cap': "You've reached today's reward limit — wonderful dedication! Rewards refresh tomorrow.",
  'low-accuracy': 'Reach 60% accuracy to earn coins and XP for this activity. You can try again anytime.',
}

function Amount({ icon, value, label }: { icon: string; value: number; label: string }) {
  if (value === 0) return null
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap font-extrabold">
      <span aria-hidden="true">{icon}</span>+{value}
      <span className="sr-only"> {label}</span>
    </span>
  )
}

/** What the player earned from a game (spec Screen 10: XP, coins, seeds). */
export function RewardSummary({ rewards, skipped }: { rewards: RewardTransaction[]; skipped: RewardSkipReason | null }) {
  const total = sumTransactions(rewards)
  return (
    <section aria-labelledby="rewards-heading" className="rounded-card bg-cream p-4 shadow-soft">
      <h2 id="rewards-heading" className="text-lg font-extrabold text-leaf-dark">
        Rewards
      </h2>
      {rewards.length > 0 && (
        <>
          <p className="mt-2 flex flex-wrap gap-4 text-xl text-ink">
            <Amount icon="⭐" value={total.xp} label="XP" />
            <Amount icon="🪙" value={total.coins} label="coins" />
            <Amount icon="🌰" value={total.seeds} label="seeds" />
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-soft">
            {rewards.map((r) => (
              <li key={r.id} className="flex justify-between gap-3">
                <span>{r.label}</span>
                <span className="flex gap-3 text-ink">
                  <Amount icon="⭐" value={r.xpDelta} label="XP" />
                  <Amount icon="🪙" value={r.coinsDelta} label="coins" />
                  <Amount icon="🌰" value={r.seedsDelta} label="seeds" />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {skipped && <p className="mt-2 text-sm text-ink-soft">{SKIP_MESSAGES[skipped]}</p>}
      {rewards.length === 0 && !skipped && <p className="mt-2 text-sm text-ink-soft">No rewards this time.</p>}
    </section>
  )
}

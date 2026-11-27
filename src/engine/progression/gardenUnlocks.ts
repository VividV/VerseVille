/**
 * Land expansions (spec §13.5): unlocked in order with a combination of player
 * level, scriptures mastered and coins. Values live in src/data/expansions.json.
 */
import type { GardenExpansion } from '../../types/garden'
import type { RewardTransaction } from '../../types/rewards'
import { EXPANSIONS } from '../garden/gardenGrid'

export interface Requirement {
  label: string
  current: number
  required: number
  met: boolean
}

export interface ExpansionCheck {
  expansion: GardenExpansion
  requirements: Requirement[]
  canUnlock: boolean
}

/** The next expansion to unlock, or null when all are unlocked. */
export function nextExpansion(expansionsUnlocked: number): GardenExpansion | null {
  return EXPANSIONS[expansionsUnlocked] ?? null
}

export function checkExpansion(
  expansion: GardenExpansion,
  player: { level: number; masteredCount: number; coins: number },
): ExpansionCheck {
  const requirements: Requirement[] = [
    { label: `Reach level ${expansion.requiredLevel}`, current: player.level, required: expansion.requiredLevel },
    {
      label: `Master ${expansion.requiredMastered} scriptures`,
      current: player.masteredCount,
      required: expansion.requiredMastered,
    },
    { label: `${expansion.coinCost} coins`, current: player.coins, required: expansion.coinCost },
  ].map((r) => ({ ...r, met: r.current >= r.required }))
  return { expansion, requirements, canUnlock: requirements.every((r) => r.met) }
}

export function expansionTransaction(expansion: GardenExpansion, now: Date): RewardTransaction {
  return {
    id: `land-expansion:${expansion.id}`,
    sourceType: 'land-expansion',
    sourceId: String(expansion.id),
    sessionId: null,
    coinsDelta: -expansion.coinCost,
    seedsDelta: 0,
    gemsDelta: 0,
    xpDelta: 0,
    label: `Unlocked the ${expansion.name}`,
    createdAt: now.toISOString(),
  }
}

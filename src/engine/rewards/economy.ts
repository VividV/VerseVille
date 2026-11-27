/**
 * Resource rules: starting balance, applying reward transactions, affordability.
 * Balances can never go negative.
 */
import type { PlayerResources } from '../../types/player'
import type { ResourceAmounts, RewardTransaction } from '../../types/rewards'
import { levelForXp } from '../progression/playerLevel'

/** Resources given to every new player (spec §13.1). */
export const STARTING_RESOURCES: Omit<PlayerResources, 'updatedAt'> = {
  coins: 100,
  seeds: 5,
  gems: 0,
  xp: 0,
  level: 1,
}

export class InsufficientResourcesError extends Error {
  constructor() {
    super("You don't have enough resources for that.")
    this.name = 'InsufficientResourcesError'
  }
}

/** True if the player has at least `cost` of every resource. */
export function canAfford(resources: ResourceAmounts, cost: Partial<ResourceAmounts>): boolean {
  return (
    resources.coins >= (cost.coins ?? 0) &&
    resources.seeds >= (cost.seeds ?? 0) &&
    resources.gems >= (cost.gems ?? 0) &&
    resources.xp >= (cost.xp ?? 0)
  )
}

/**
 * Applies transactions to a balance and recalculates the level.
 * Throws (and changes nothing) if any balance would go below zero.
 */
export function applyTransactions(
  resources: PlayerResources,
  transactions: RewardTransaction[],
  now: Date,
): PlayerResources {
  const next = { ...resources }
  for (const t of transactions) {
    next.coins += t.coinsDelta
    next.seeds += t.seedsDelta
    next.gems += t.gemsDelta
    next.xp += t.xpDelta
  }
  if (next.coins < 0 || next.seeds < 0 || next.gems < 0 || next.xp < 0) throw new InsufficientResourcesError()
  next.level = levelForXp(next.xp)
  next.updatedAt = now.toISOString()
  return next
}

/** Adds up several transactions, e.g. to show "you earned" totals. */
export function sumTransactions(transactions: RewardTransaction[]): ResourceAmounts {
  return transactions.reduce(
    (sum, t) => ({
      coins: sum.coins + t.coinsDelta,
      seeds: sum.seeds + t.seedsDelta,
      gems: sum.gems + t.gemsDelta,
      xp: sum.xp + t.xpDelta,
    }),
    { coins: 0, seeds: 0, gems: 0, xp: 0 },
  )
}

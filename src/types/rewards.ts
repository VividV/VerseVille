/** Where a resource change came from. Spending uses negative amounts. */
export type RewardSourceType =
  | 'game'
  | 'review'
  | 'scripture-learned'
  | 'scripture-mastered'
  | 'quest'
  | 'daily-goal'
  | 'purchase'
  | 'land-expansion'

/**
 * One change to the player's resources (spec §8 reward_transactions, §11.7).
 * The id is deterministic (e.g. "mastered:psalm-23-1-kjv"), so the same reward
 * can never be saved twice: the database refuses a second record with that id.
 */
export interface RewardTransaction {
  id: string
  sourceType: RewardSourceType
  sourceId: string
  /** The game session that caused it, if any. */
  sessionId: string | null
  coinsDelta: number
  seedsDelta: number
  gemsDelta: number
  xpDelta: number
  /** Short description for the player, e.g. "Verse Recall". */
  label: string
  createdAt: string
}

export interface ResourceAmounts {
  coins: number
  seeds: number
  gems: number
  xp: number
}

/**
 * The central reward engine (spec §11). Every reward in the game is calculated
 * here — game screens never work out rewards themselves.
 *
 * Each reward becomes a RewardTransaction with a predictable id:
 *   game:<scripture>:<game type>:<local date>   first completion of a game per scripture per day
 *   review:<scripture>:<local date>             a successful review
 *   scripture-learned:<scripture>               once ever
 *   scripture-mastered:<scripture>              once ever
 * If a transaction with that id already exists, the reward is not given again.
 * This gives both the daily limit (§11.6) and duplicate protection (§11.7).
 */
import type { GameSession, GameType } from '../../types/games'
import type { RewardTransaction } from '../../types/rewards'
import type { LearningUpdate } from '../memorisation/learningEngine'
import { GAME_INFO } from '../games/gameRules'
import { toLocalDateKey } from '../../utils/dateUtils'

/** All reward amounts and limits in one place, so they're easy to tune. */
export const REWARD_CONFIG = {
  gameXp: { 'missing-words': 5, 'word-order': 5, recall: 15 } as Record<GameType, number>,
  gameCoins: { 'missing-words': 5, 'word-order': 5, recall: 10 } as Record<GameType, number>,
  reviewCoins: 5,
  learnedXp: 10,
  learnedSeeds: 1,
  masteredXp: 25,
  masteredCoins: 15,
  masteredSeeds: 1,
  /** A game must reach this accuracy to earn its completion reward. */
  minAccuracyForReward: 0.6,
  /** Most coins / XP that games and reviews can give in one local day. Milestones aren't capped. */
  dailyCoinCap: 200,
  dailyXpCap: 300,
}

/** Accuracy multiplier (spec §11.4). Below 60% there's no bonus (×1). */
export function accuracyMultiplier(accuracy: number): number {
  const percent = Math.round(accuracy * 100)
  if (percent >= 95) return 1.5
  if (percent >= 85) return 1.2
  return 1.0
}

/** final_reward = round(base × accuracy_multiplier) (spec §11.5) */
export function applyMultiplier(base: number, accuracy: number): number {
  return Math.round(base * accuracyMultiplier(accuracy))
}

/** Coins and XP already earned today from capped sources (games and reviews). */
export function earnedTodayFromGames(transactions: RewardTransaction[], now: Date): { coins: number; xp: number } {
  const today = toLocalDateKey(now)
  return transactions
    .filter((t) => (t.sourceType === 'game' || t.sourceType === 'review') && toLocalDateKey(new Date(t.createdAt)) === today)
    .reduce((sum, t) => ({ coins: sum.coins + t.coinsDelta, xp: sum.xp + t.xpDelta }), { coins: 0, xp: 0 })
}

export type RewardSkipReason = 'already-earned-today' | 'daily-cap' | 'low-accuracy'

export interface GameRewards {
  transactions: RewardTransaction[]
  /** Why the completion reward wasn't given, if it wasn't. */
  skipped: RewardSkipReason | null
}

export function calculateGameRewards(input: {
  session: GameSession
  update: LearningUpdate
  existingTransactionIds: ReadonlySet<string>
  allTransactions: RewardTransaction[]
}): GameRewards {
  const { session, update, existingTransactionIds } = input
  const completedAt = new Date(session.completedAt)
  const day = toLocalDateKey(completedAt)
  const scriptureId = session.scriptureId
  const transactions: RewardTransaction[] = []
  let skipped: RewardSkipReason | null = null

  const make = (
    id: string,
    sourceType: RewardTransaction['sourceType'],
    label: string,
    deltas: Partial<Pick<RewardTransaction, 'coinsDelta' | 'seedsDelta' | 'gemsDelta' | 'xpDelta'>>,
  ): RewardTransaction => ({
    id,
    sourceType,
    sourceId: scriptureId,
    sessionId: session.id,
    coinsDelta: deltas.coinsDelta ?? 0,
    seedsDelta: deltas.seedsDelta ?? 0,
    gemsDelta: deltas.gemsDelta ?? 0,
    xpDelta: deltas.xpDelta ?? 0,
    label,
    createdAt: session.completedAt,
  })

  // Daily cap for games and reviews.
  const earned = earnedTodayFromGames(input.allTransactions, completedAt)
  let coinRoom = Math.max(0, REWARD_CONFIG.dailyCoinCap - earned.coins)
  let xpRoom = Math.max(0, REWARD_CONFIG.dailyXpCap - earned.xp)
  const capped = (coins: number, xp: number) => {
    const c = Math.min(coins, coinRoom)
    const x = Math.min(xp, xpRoom)
    coinRoom -= c
    xpRoom -= x
    return { coinsDelta: c, xpDelta: x }
  }

  // 1. Game completion: first time today for this scripture and game type.
  const gameId = `game:${scriptureId}:${session.gameType}:${day}`
  if (session.accuracy < REWARD_CONFIG.minAccuracyForReward) {
    skipped = 'low-accuracy'
  } else if (existingTransactionIds.has(gameId)) {
    skipped = 'already-earned-today'
  } else {
    const amounts = capped(
      applyMultiplier(REWARD_CONFIG.gameCoins[session.gameType], session.accuracy),
      applyMultiplier(REWARD_CONFIG.gameXp[session.gameType], session.accuracy),
    )
    if (amounts.coinsDelta === 0 && amounts.xpDelta === 0) skipped = 'daily-cap'
    else transactions.push(make(gameId, 'game', GAME_INFO[session.gameType].name, amounts))
  }

  // 2. Successful review.
  const reviewId = `review:${scriptureId}:${day}`
  if (update.events.reviewCompleted && update.successful && !existingTransactionIds.has(reviewId)) {
    const amounts = capped(applyMultiplier(REWARD_CONFIG.reviewCoins, session.accuracy), 0)
    if (amounts.coinsDelta > 0) transactions.push(make(reviewId, 'review', 'Successful review', amounts))
  }

  // 3. Milestones — never multiplied or capped (spec §11.4).
  const learnedId = `scripture-learned:${scriptureId}`
  if (update.events.scriptureLearned && !existingTransactionIds.has(learnedId)) {
    transactions.push(
      make(learnedId, 'scripture-learned', 'Scripture learned', {
        xpDelta: REWARD_CONFIG.learnedXp,
        seedsDelta: REWARD_CONFIG.learnedSeeds,
      }),
    )
  }
  const masteredId = `scripture-mastered:${scriptureId}`
  if (update.events.scriptureMastered && !existingTransactionIds.has(masteredId)) {
    transactions.push(
      make(masteredId, 'scripture-mastered', 'Scripture mastered', {
        xpDelta: REWARD_CONFIG.masteredXp,
        coinsDelta: REWARD_CONFIG.masteredCoins,
        seedsDelta: REWARD_CONFIG.masteredSeeds,
      }),
    )
  }

  return { transactions, skipped }
}

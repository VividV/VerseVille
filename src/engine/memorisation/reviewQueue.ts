/**
 * What should the player do next? (spec §10 review queue, Screen 3 "Continue Learning")
 *   1. Reviews that are due, earliest (most overdue) first
 *   2. A scripture they started but haven't finished learning
 *   3. A new scripture
 * Reviews always come first: nobody is pushed to learn a new verse before reviewing.
 */
import type { GameType } from '../../types/games'
import type { PlayerScripture, Scripture } from '../../types/scripture'
import { LEARNING_SEQUENCE } from './learningEngine'
import { isDue } from './scheduler'

export type NextReason = 'review' | 'continue' | 'new'

export interface NextActivity {
  scripture: Scripture
  reason: NextReason
  gameType: GameType
}

/** Started scriptures whose review is due, most overdue first. */
export function getDueReviews(progressById: Record<string, PlayerScripture>, now: Date): PlayerScripture[] {
  return Object.values(progressById)
    .filter((p) => isDue(p.nextReviewAt, now))
    .sort((a, b) => new Date(a.nextReviewAt!).getTime() - new Date(b.nextReviewAt!).getTime())
}

/** The next activity of the learning sequence not yet finished, or null when learned. */
export function nextLearningStep(progress: PlayerScripture | undefined): GameType | null {
  if (!progress) return LEARNING_SEQUENCE[0]
  if (progress.learnedAt) return null
  return LEARNING_SEQUENCE.find((g) => !progress.completedGameTypes.includes(g)) ?? null
}

/** Recommended activity for a scripture (spec Screen 6). */
export function recommendGameFor(progress: PlayerScripture | undefined): GameType {
  const step = nextLearningStep(progress)
  if (step) return step
  switch (progress!.status) {
    case 'learning':
    case 'growing':
      return 'word-order'
    case 'strong':
    case 'mastered':
      return 'recall'
  }
}

export function getNextActivity(
  scriptures: Scripture[],
  progressById: Record<string, PlayerScripture>,
  now: Date,
): NextActivity | null {
  const byId = new Map(scriptures.map((s) => [s.id, s]))

  for (const p of getDueReviews(progressById, now)) {
    const scripture = byId.get(p.scriptureId)
    if (scripture) return { scripture, reason: 'review', gameType: recommendGameFor(p) }
  }

  const unfinished = Object.values(progressById)
    .filter((p) => !p.learnedAt && byId.has(p.scriptureId))
    .sort((a, b) => a.learningStartedAt.localeCompare(b.learningStartedAt))[0]
  if (unfinished) {
    return { scripture: byId.get(unfinished.scriptureId)!, reason: 'continue', gameType: recommendGameFor(unfinished) }
  }

  const fresh = scriptures.find((s) => !progressById[s.id])
  if (fresh) return { scripture: fresh, reason: 'new', gameType: LEARNING_SEQUENCE[0] }
  return null
}

import type { NextActivity } from '../engine/memorisation/reviewQueue'
import { gamePath } from '../engine/games/gameRules'

/**
 * Where "Continue Learning" goes. A new scripture opens its detail page first so the
 * player reads the verse and its meaning (spec §9.2 steps 1–2); reviews and
 * unfinished scriptures go straight to the recommended activity.
 */
export function nextActivityPath(next: NextActivity): string {
  return next.reason === 'new' ? `/scriptures/${next.scripture.id}` : gamePath(next.gameType, next.scripture.id)
}

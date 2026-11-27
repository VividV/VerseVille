/**
 * Numbers for the progress dashboard (spec Screen 14). Pure functions.
 * The headline is long-term recall, not time spent or sessions played.
 */
import type { GameSession } from '../../types/games'
import type { PlayerScripture } from '../../types/scripture'
import type { DayRecord } from '../../types/quests'
import { currentStreak } from '../quests/questEngine'

export const RECALL_WINDOW_DAYS = 30

export interface ProgressStats {
  /** Strong or Mastered right now: verses the player can recall without help. */
  versesYouCanRecall: number
  learned: number
  mastered: number
  started: number
  reviewsCompleted: number
  /** Average Verse Recall accuracy over the last 30 days (0–1), or null with no recalls. */
  recallAccuracy: number | null
  recallAttempts: number
  streak: number
}

export function computeProgressStats(input: {
  progress: Record<string, PlayerScripture>
  sessions: GameSession[]
  days: Record<string, DayRecord>
  now: Date
}): ProgressStats {
  const all = Object.values(input.progress)
  const since = input.now.getTime() - RECALL_WINDOW_DAYS * 86_400_000
  const recalls = input.sessions.filter((s) => s.gameType === 'recall' && new Date(s.completedAt).getTime() >= since)
  return {
    versesYouCanRecall: all.filter((p) => p.status === 'strong' || p.status === 'mastered').length,
    learned: all.filter((p) => p.learnedAt !== null).length,
    mastered: all.filter((p) => p.status === 'mastered').length,
    started: all.length,
    reviewsCompleted: all.reduce((sum, p) => sum + p.reviewsCompleted, 0),
    recallAccuracy: recalls.length ? recalls.reduce((sum, s) => sum + s.accuracy, 0) / recalls.length : null,
    recallAttempts: recalls.length,
    streak: currentStreak(input.days, input.now),
  }
}

export interface GardenStage {
  name: string
  icon: string
}

/** A simple description of how far the garden has grown. */
export function gardenStage(placedItems: number, expansionsUnlocked: number): GardenStage {
  if (expansionsUnlocked >= 3) return { name: 'Flourishing Village', icon: '🏘️' }
  if (expansionsUnlocked >= 1) return { name: 'Growing Village', icon: '🏡' }
  if (placedItems >= 15) return { name: 'Blooming Garden', icon: '🌷' }
  if (placedItems >= 9) return { name: 'Budding Garden', icon: '🌿' }
  return { name: 'Young Garden', icon: '🌱' }
}

import type { TranslationCode } from './player'
import type { GameType } from './games'

/** One verse in the scripture library (src/data/scriptures.json, spec §7). */
export interface Scripture {
  id: string // e.g. "psalm-23-1-kjv"
  book: string // e.g. "Psalms"
  chapter: number
  verse: number
  reference: string // e.g. "Psalm 23:1"
  translation: TranslationCode
  text: string
  topicIds: string[]
  explanation: string
  relatedScriptureIds: string[]
  difficulty: 1 | 2 | 3
  wordCount: number
  isActive: boolean
}

export interface Topic {
  id: string
  name: string
  icon: string
}

/** Learning state of a scripture for one player (spec §9.1). */
export type ScriptureStatus = 'new' | 'learning' | 'growing' | 'strong' | 'mastered'

/**
 * A player's progress on one scripture (spec §8 player_scriptures), created the
 * first time they finish a game on it. Updated only by src/engine/memorisation.
 */
export interface PlayerScripture {
  scriptureId: string
  status: Exclude<ScriptureStatus, 'new'>
  masteryScore: number // 0–100
  learningStartedAt: string
  lastReviewedAt: string | null
  nextReviewAt: string | null
  /** Successful Verse Recalls in a row (reset by a failed recall). */
  consecutiveSuccesses: number
  totalAttempts: number
  successfulAttempts: number
  /** When the scripture first became Mastered. */
  masteredAt: string | null

  // --- Extra fields used by the learning engine ---
  /** Which activities have been finished at least once (the learning sequence, spec §9.2). */
  completedGameTypes: GameType[]
  /** When all three activities had been finished: the scripture counts as "learned". */
  learnedAt: string | null
  /** Position in the review interval ladder (see scheduler.ts). */
  intervalStep: number
  /** Local dates (YYYY-MM-DD) with a successful independent recall. Mastery needs 3. */
  successfulRecallDays: string[]
  /** Local date of the last mastery change per activity, so each counts once a day. */
  masteryChangeDays: Partial<Record<MasteryChangeKind, string>>
  /** Reviews completed (games finished while the scripture was due). */
  reviewsCompleted: number
  updatedAt: string
}

export type MasteryChangeKind = GameType | 'recall-failed'

/** Status filters in the scripture library (spec Screen 4). */
export type LibraryFilter = 'all' | 'new' | 'learning' | 'review-due' | 'mastered'

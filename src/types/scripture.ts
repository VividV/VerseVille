import type { TranslationCode } from './player'

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

/** A player's progress on one scripture (spec §8 player_scriptures). Created in Phase 4. */
export interface PlayerScripture {
  scriptureId: string
  status: Exclude<ScriptureStatus, 'new'>
  masteryScore: number // 0–100
  learningStartedAt: string
  lastReviewedAt: string | null
  nextReviewAt: string | null
  consecutiveSuccesses: number
  totalAttempts: number
  successfulAttempts: number
  masteredAt: string | null
}

/** Status filters in the scripture library (spec Screen 4). */
export type LibraryFilter = 'all' | 'new' | 'learning' | 'review-due' | 'mastered'

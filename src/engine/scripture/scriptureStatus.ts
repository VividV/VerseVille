/**
 * Works out a scripture's learning status and whether its review is due.
 * Progress records are created by the learning engine (Phase 4); with no record
 * a scripture is simply "new".
 */
import type { LibraryFilter, PlayerScripture, ScriptureStatus } from '../../types/scripture'

export function getScriptureStatus(progress: PlayerScripture | undefined): ScriptureStatus {
  return progress ? progress.status : 'new'
}

/** True when a started scripture's next review time has arrived. */
export function isReviewDue(progress: PlayerScripture | undefined, now: Date): boolean {
  if (!progress?.nextReviewAt) return false
  return new Date(progress.nextReviewAt).getTime() <= now.getTime()
}

/** Does a scripture with this progress belong under the given library filter? */
export function matchesLibraryFilter(progress: PlayerScripture | undefined, filter: LibraryFilter, now: Date): boolean {
  const status = getScriptureStatus(progress)
  switch (filter) {
    case 'all':
      return true
    case 'new':
      return status === 'new'
    case 'learning':
      return status === 'learning' || status === 'growing' || status === 'strong'
    case 'review-due':
      return isReviewDue(progress, now)
    case 'mastered':
      return status === 'mastered'
  }
}

export const STATUS_LABELS: Record<ScriptureStatus, string> = {
  new: 'New',
  learning: 'Learning',
  growing: 'Growing',
  strong: 'Strong',
  mastered: 'Mastered',
}

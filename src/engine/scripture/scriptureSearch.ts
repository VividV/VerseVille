/**
 * Scripture library search and filtering (spec Screen 4).
 * Search matches the reference ("psalm 23", "john 3:16", "Psalms"), topic names, or verse text.
 */
import type { LibraryFilter, PlayerScripture, Scripture } from '../../types/scripture'
import { normaliseText } from '../../utils/textNormalisation'
import { getTopicNames } from './scriptureCatalog'
import { matchesLibraryFilter } from './scriptureStatus'

export interface LibraryQuery {
  search: string
  topicId: string | null
  filter: LibraryFilter
}

function searchableText(s: Scripture): string {
  // Reference is normalised so "John 3:16" becomes "john 3 16"; the book name catches "Psalms".
  return normaliseText([s.reference, s.book, ...getTopicNames(s), s.text].join(' '))
}

/**
 * True when every word typed matches a word in the scripture's reference, topics or text.
 * Words match by prefix ("shep" finds "shepherd"); numbers must match exactly ("3" does not find "13").
 */
export function matchesSearch(scripture: Scripture, search: string): boolean {
  const words = normaliseText(search).split(' ').filter(Boolean)
  if (words.length === 0) return true
  const tokens = searchableText(scripture).split(' ')
  return words.every((w) => (/^\d+$/.test(w) ? tokens.includes(w) : tokens.some((t) => t.startsWith(w))))
}

export function queryLibrary(
  scriptures: Scripture[],
  progressById: Record<string, PlayerScripture>,
  query: LibraryQuery,
  now: Date,
): Scripture[] {
  return scriptures.filter(
    (s) =>
      (query.topicId === null || s.topicIds.includes(query.topicId)) &&
      matchesLibraryFilter(progressById[s.id], query.filter, now) &&
      matchesSearch(s, query.search),
  )
}

import { describe, expect, it } from 'vitest'
import type { PlayerScripture } from '../../types/scripture'
import { getScriptureById, getScriptures } from './scriptureCatalog'
import { matchesSearch, queryLibrary } from './scriptureSearch'
import { getScriptureStatus, isReviewDue, matchesLibraryFilter } from './scriptureStatus'

const all = getScriptures('KJV')
const now = new Date('2026-11-27T10:00:00')
const ids = (list: { id: string }[]) => list.map((s) => s.id)

function progress(scriptureId: string, changes: Partial<PlayerScripture> = {}): PlayerScripture {
  return {
    scriptureId,
    status: 'learning',
    masteryScore: 10,
    learningStartedAt: '2026-11-20T10:00:00',
    lastReviewedAt: null,
    nextReviewAt: '2026-11-30T10:00:00',
    consecutiveSuccesses: 0,
    totalAttempts: 1,
    successfulAttempts: 1,
    masteredAt: null,
    ...changes,
  }
}

describe('matchesSearch', () => {
  const john316 = getScriptureById('john-3-16-kjv')!
  const psalm23 = getScriptureById('psalm-23-1-kjv')!

  it('finds by reference in different forms', () => {
    expect(matchesSearch(john316, 'John 3:16')).toBe(true)
    expect(matchesSearch(john316, 'john 3 16')).toBe(true)
    expect(matchesSearch(psalm23, 'psalms 23')).toBe(true)
    expect(matchesSearch(psalm23, 'Psalm 23')).toBe(true)
  })

  it('finds by text, ignoring case and punctuation, and by word prefix', () => {
    expect(matchesSearch(psalm23, 'SHEPHERD; I shall')).toBe(true)
    expect(matchesSearch(psalm23, 'shep')).toBe(true)
  })

  it('finds by topic name', () => {
    expect(matchesSearch(psalm23, 'provision')).toBe(true)
  })

  it('does not match numbers inside other numbers', () => {
    expect(matchesSearch(getScriptureById('philippians-4-13-kjv')!, '3')).toBe(false)
  })

  it('returns everything for an empty search', () => {
    expect(matchesSearch(psalm23, '   ')).toBe(true)
  })
})

describe('queryLibrary', () => {
  it('search "john 3:16" returns only John 3:16', () => {
    expect(ids(queryLibrary(all, {}, { search: 'john 3:16', topicId: null, filter: 'all' }, now))).toEqual(['john-3-16-kjv'])
  })

  it('filters by topic', () => {
    const results = queryLibrary(all, {}, { search: '', topicId: 'peace', filter: 'all' }, now)
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((s) => s.topicIds.includes('peace'))).toBe(true)
  })

  it('treats everything as New when the player has no progress', () => {
    expect(queryLibrary(all, {}, { search: '', topicId: null, filter: 'new' }, now)).toHaveLength(all.length)
    expect(queryLibrary(all, {}, { search: '', topicId: null, filter: 'learning' }, now)).toHaveLength(0)
    expect(queryLibrary(all, {}, { search: '', topicId: null, filter: 'review-due' }, now)).toHaveLength(0)
    expect(queryLibrary(all, {}, { search: '', topicId: null, filter: 'mastered' }, now)).toHaveLength(0)
  })

  it('sorts scriptures into the right status filters', () => {
    const map = {
      'john-3-16-kjv': progress('john-3-16-kjv', { status: 'growing' }),
      'psalm-23-1-kjv': progress('psalm-23-1-kjv', { status: 'strong', nextReviewAt: '2026-11-26T09:00:00' }),
      'genesis-1-1-kjv': progress('genesis-1-1-kjv', { status: 'mastered', masteryScore: 90 }),
    }
    const q = (filter: 'new' | 'learning' | 'review-due' | 'mastered') =>
      ids(queryLibrary(all, map, { search: '', topicId: null, filter }, now))
    expect(q('learning').sort()).toEqual(['john-3-16-kjv', 'psalm-23-1-kjv'])
    expect(q('review-due')).toEqual(['psalm-23-1-kjv'])
    expect(q('mastered')).toEqual(['genesis-1-1-kjv'])
    expect(q('new')).toHaveLength(all.length - 3)
  })

  it('combines search, topic and status', () => {
    const map = { 'psalm-23-1-kjv': progress('psalm-23-1-kjv') }
    expect(ids(queryLibrary(all, map, { search: 'shepherd', topicId: 'trust', filter: 'learning' }, now))).toEqual([
      'psalm-23-1-kjv',
    ])
  })
})

describe('scriptureStatus', () => {
  it('is new without progress', () => {
    expect(getScriptureStatus(undefined)).toBe('new')
    expect(isReviewDue(undefined, now)).toBe(false)
  })
  it('is due exactly at the review time', () => {
    expect(isReviewDue(progress('x', { nextReviewAt: now.toISOString() }), now)).toBe(true)
    expect(isReviewDue(progress('x', { nextReviewAt: '2026-11-27T10:00:01' }), now)).toBe(false)
  })
  it('all filter matches everything', () => {
    expect(matchesLibraryFilter(undefined, 'all', now)).toBe(true)
  })
})

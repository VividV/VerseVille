/**
 * Data checks for the scripture library. These guard against typos when verses are
 * added or edited. (Verse wording itself was checked against two independent KJV
 * sources by scripts/scripture-data/build.py.)
 */
import { describe, expect, it } from 'vitest'
import { getAllScripturesIncludingInactive, getTopics } from '../engine/scripture/scriptureCatalog'

const scriptures = getAllScripturesIncludingInactive()
const ids = new Set(scriptures.map((s) => s.id))
const topicIds = new Set(getTopics().map((t) => t.id))

describe('scriptures.json', () => {
  it('has at least 50 active scriptures (spec §7)', () => {
    expect(scriptures.filter((s) => s.isActive).length).toBeGreaterThanOrEqual(50)
  })

  it('has unique ids that match the reference and translation', () => {
    expect(ids.size).toBe(scriptures.length)
    for (const s of scriptures) {
      const slug = s.reference.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      expect(s.id).toBe(`${slug}-${s.translation.toLowerCase()}`)
    }
  })

  it('has references that agree with book, chapter and verse', () => {
    for (const s of scriptures) {
      const book = s.book === 'Psalms' ? 'Psalm' : s.book
      expect(s.reference).toBe(`${book} ${s.chapter}:${s.verse}`)
    }
  })

  it('has no duplicate verses', () => {
    const keys = scriptures.map((s) => `${s.book}|${s.chapter}|${s.verse}|${s.translation}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('stores a correct word count and difficulty 1–3', () => {
    for (const s of scriptures) {
      expect(s.wordCount, s.id).toBe(s.text.trim().split(/\s+/).length)
      expect([1, 2, 3]).toContain(s.difficulty)
    }
  })

  it('has clean text and an explanation for every verse', () => {
    for (const s of scriptures) {
      expect(s.text, s.id).toBe(s.text.trim())
      expect(s.text, s.id).not.toMatch(/\s{2,}|\s[,.;:?!]/)
      expect(s.explanation.length, s.id).toBeGreaterThan(30)
    }
  })

  it('only uses known topics and links to related scriptures that exist', () => {
    for (const s of scriptures) {
      expect(s.topicIds.length, s.id).toBeGreaterThan(0)
      for (const t of s.topicIds) expect(topicIds.has(t), `${s.id} topic ${t}`).toBe(true)
      for (const r of s.relatedScriptureIds) {
        expect(ids.has(r), `${s.id} related ${r}`).toBe(true)
        expect(r).not.toBe(s.id)
      }
    }
  })

  it('contains the spec example verse exactly', () => {
    const psalm = scriptures.find((s) => s.id === 'psalm-23-1-kjv')
    expect(psalm?.text).toBe('The LORD is my shepherd; I shall not want.')
    expect(psalm?.wordCount).toBe(9)
  })
})

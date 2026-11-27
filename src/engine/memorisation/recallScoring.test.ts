import { describe, expect, it } from 'vitest'
import { scoreRecall } from './recallScoring'

const PSALM = 'The LORD is my shepherd; I shall not want.' // 9 words

describe('scoreRecall (spec §20 scripture scoring)', () => {
  it('scores an exact recall as 100%', () => {
    const s = scoreRecall(PSALM, 'The LORD is my shepherd; I shall not want.')
    expect(s.accuracy).toBe(1)
    expect(s.correctWords).toBe(9)
    expect(s.diff.every((d) => d.type === 'correct')).toBe(true)
  })

  it('ignores capitalisation differences', () => {
    expect(scoreRecall(PSALM, 'the lord IS MY shepherd i shall not want').accuracy).toBe(1)
  })

  it('ignores punctuation and spacing differences', () => {
    expect(scoreRecall(PSALM, '  The Lord, is my shepherd!!  I shall   not want ').accuracy).toBe(1)
    expect(scoreRecall('It is of the LORD’s mercies', "it is of the LORD's mercies").accuracy).toBe(1)
  })

  it('counts missing words', () => {
    const s = scoreRecall(PSALM, 'The LORD is my shepherd; I shall want.')
    expect(s.correctWords).toBe(8)
    expect(s.missingWords).toBe(1)
    expect(s.accuracy).toBeCloseTo(8 / 9)
    expect(s.diff).toContainEqual({ type: 'missing', expected: 'not' })
  })

  it('counts incorrect words', () => {
    const s = scoreRecall(PSALM, 'The LORD is my keeper; I shall not want.')
    expect(s.wrongWords).toBe(1)
    expect(s.diff).toContainEqual({ type: 'wrong', expected: 'shepherd;', actual: 'keeper' })
    expect(s.accuracy).toBeCloseTo(8 / 9)
  })

  it('handles repeated words correctly', () => {
    const verse = 'In the beginning was the Word, and the Word was with God, and the Word was God.'
    expect(scoreRecall(verse, verse).accuracy).toBe(1)
    // Dropping one "the Word" phrase: 2 missing words, everything else lines up.
    const s = scoreRecall(verse, 'In the beginning was the Word, and the Word was with God, and was God.')
    expect(s.missingWords).toBe(2)
    expect(s.wrongWords).toBe(0)
    expect(s.correctWords).toBe(s.totalWords - 2)
  })

  it('penalises extra words so padding cannot reach 100%', () => {
    const s = scoreRecall(PSALM, 'The LORD is my good shepherd; I shall not want.')
    expect(s.extraWords).toBe(1)
    expect(s.correctWords).toBe(9)
    expect(s.accuracy).toBeCloseTo(9 / 10)
    expect(scoreRecall(PSALM, `${PSALM} ${PSALM}`).accuracy).toBeCloseTo(0.5)
  })

  it('pairs a wrong word with the most similar expected word', () => {
    const s = scoreRecall(PSALM, 'The Lord is my good keeper I shall not want')
    expect(s.diff).toContainEqual({ type: 'extra', actual: 'good' })
    expect(s.diff).toContainEqual({ type: 'wrong', expected: 'shepherd;', actual: 'keeper' })
    expect(s.correctWords).toBe(8)
  })

  it('scores an empty answer as 0 with every word missing', () => {
    const s = scoreRecall(PSALM, '   ')
    expect(s.accuracy).toBe(0)
    expect(s.missingWords).toBe(9)
  })

  it('folds special letters like æ', () => {
    expect(scoreRecall('in all Judæa', 'in all Judaea').accuracy).toBe(1)
  })
})

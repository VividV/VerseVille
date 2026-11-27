import { describe, expect, it } from 'vitest'
import { addMastery, clampMastery, isFailedRecall, isSuccessful, masteryStatus, reduceMastery } from './mastery'

describe('mastery (spec §9.4, §20)', () => {
  it('increases by the amounts in the spec', () => {
    expect(addMastery(0, 'missing-words')).toBe(10)
    expect(addMastery(10, 'word-order')).toBe(25)
    expect(addMastery(25, 'recall')).toBe(50)
  })

  it('never exceeds 100 or falls below 0', () => {
    expect(addMastery(90, 'recall')).toBe(100)
    expect(addMastery(100, 'recall')).toBe(100)
    expect(reduceMastery(5)).toBe(0)
    expect(clampMastery(-20)).toBe(0)
    expect(clampMastery(140)).toBe(100)
  })

  it('reduces by 10 after a failed recall', () => {
    expect(reduceMastery(60)).toBe(50)
  })

  it('lets assisted games raise the score only to 49 (Growing)', () => {
    expect(addMastery(45, 'word-order')).toBe(49)
    expect(addMastery(49, 'missing-words')).toBe(49)
    expect(addMastery(60, 'missing-words')).toBe(60) // never lowers a higher score
    expect(addMastery(49, 'recall')).toBe(74)
  })

  it('maps scores to statuses', () => {
    expect(masteryStatus(0, 0)).toBe('learning')
    expect(masteryStatus(19, 0)).toBe('learning')
    expect(masteryStatus(20, 0)).toBe('growing')
    expect(masteryStatus(49, 0)).toBe('growing')
    expect(masteryStatus(50, 0)).toBe('strong')
    expect(masteryStatus(79, 3)).toBe('strong')
  })

  it('requires successful recalls on three separate days for Mastered', () => {
    expect(masteryStatus(100, 1)).toBe('strong')
    expect(masteryStatus(100, 2)).toBe('strong')
    expect(masteryStatus(80, 3)).toBe('mastered')
  })

  it('uses the spec accuracy bands', () => {
    expect(isSuccessful('recall', 0.85)).toBe(true)
    expect(isSuccessful('recall', 0.84)).toBe(false)
    expect(isSuccessful('missing-words', 0.6)).toBe(true)
    expect(isFailedRecall(0.59)).toBe(true)
    expect(isFailedRecall(0.6)).toBe(false)
  })
})

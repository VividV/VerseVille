import { describe, expect, it } from 'vitest'
import { levelForXp, levelProgress, levelTitle, totalXpForLevel, xpForNextLevel } from './playerLevel'

describe('player levels (spec §12)', () => {
  it('uses XP required = 100 + level × 50', () => {
    expect([1, 2, 3, 4, 5].map(xpForNextLevel)).toEqual([150, 200, 250, 300, 350])
  })
  it('works out the level from total XP without resetting it', () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(149)).toBe(1)
    expect(levelForXp(150)).toBe(2)
    expect(levelForXp(349)).toBe(2)
    expect(levelForXp(350)).toBe(3)
    expect(totalXpForLevel(4)).toBe(600)
  })
  it('reports progress inside the current level', () => {
    expect(levelProgress(180)).toEqual({ level: 2, xpIntoLevel: 30, xpNeeded: 200 })
  })
  it('has a title for every level', () => {
    expect(levelTitle(1)).toBe('Seedling')
    expect(levelTitle(99)).toBeTruthy()
  })
})

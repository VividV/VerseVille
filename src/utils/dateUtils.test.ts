import { describe, expect, it } from 'vitest'
import { addLocalDays, localDaysBetween, toLocalDateKey } from './dateUtils'

describe('dateUtils', () => {
  it('formats the local calendar date', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('adds local days across month ends', () => {
    expect(toLocalDateKey(addLocalDays(new Date(2026, 0, 31, 9), 1))).toBe('2026-02-01')
  })

  it('counts local calendar days, ignoring time of day', () => {
    expect(localDaysBetween(new Date(2026, 2, 1, 23, 0), new Date(2026, 2, 2, 0, 30))).toBe(1)
    expect(localDaysBetween(new Date(2026, 2, 5), new Date(2026, 2, 1))).toBe(-4)
  })
})

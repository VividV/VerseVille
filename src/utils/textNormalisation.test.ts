import { describe, expect, it } from 'vitest'
import { normaliseText } from './textNormalisation'

describe('normaliseText', () => {
  it('lowercases, strips punctuation and collapses spaces', () => {
    expect(normaliseText('  The LORD is my shepherd;   I shall not want. ')).toBe('the lord is my shepherd i shall not want')
  })
  it('folds ligatures, accents and apostrophes', () => {
    expect(normaliseText('Judæa')).toBe('judaea')
    expect(normaliseText('the LORD’s mercies')).toBe('the lords mercies')
    expect(normaliseText("Christ's sake")).toBe('christs sake')
    expect(normaliseText('café')).toBe('cafe')
  })
})

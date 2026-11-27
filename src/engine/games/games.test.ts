import { describe, expect, it } from 'vitest'
import { createSeededRandom } from '../../utils/random'
import { tokeniseVerse } from './verseTokens'
import {
  applyMissingWordsHint,
  blankCountFor,
  createMissingWordsPuzzle,
  initialMissingWordsState,
  isMissingWordsComplete,
  missingWordsCorrectFirstTry,
  placeTile,
  selectBlank,
} from './missingWords'
import {
  applyWordOrderHint,
  checkPositions,
  checkWordOrder,
  createWordOrderPuzzle,
  initialWordOrderState,
  isWordOrderSolved,
  moveToAnswer,
  moveToPool,
  moveWithinAnswer,
  resetWordOrder,
  returnWrongTiles,
  undo,
  type WordOrderPuzzle,
  type WordOrderState,
} from './wordOrder'
import { accuracyBand, assistedAccuracy, nextInSequence, recommendGame } from './gameRules'

const PSALM = 'The LORD is my shepherd; I shall not want.'
const JOHN = 'In the beginning was the Word, and the Word was with God, and the Word was God.'
const POOL = ['mercy', 'Grace', 'wings', 'mountain', 'shepherd', 'the', 'river', 'LORD', 'bread']

describe('tokeniseVerse', () => {
  it('keeps punctuation with its word and gives repeated words unique ids', () => {
    const t = tokeniseVerse(JOHN)
    expect(t[5]).toMatchObject({ text: 'Word,', word: 'Word', suffix: ',', normalised: 'word' })
    expect(new Set(t.map((x) => x.id)).size).toBe(t.length)
    expect(t.filter((x) => x.normalised === 'word')).toHaveLength(3)
  })
})

describe('Missing Words', () => {
  const puzzle = createMissingWordsPuzzle(PSALM, POOL, createSeededRandom(1))

  it('blanks about a quarter of the words', () => {
    expect(blankCountFor(9)).toBe(2)
    expect(blankCountFor(2)).toBe(1)
    expect(blankCountFor(60)).toBe(6)
    expect(puzzle.blankIndexes).toHaveLength(2)
  })

  it('never uses a distractor that also appears in the verse', () => {
    const verseWords = new Set(puzzle.tokens.map((t) => t.normalised))
    const distractors = puzzle.tiles.filter((t) => t.isDistractor)
    expect(distractors.length).toBeGreaterThanOrEqual(2)
    for (const d of distractors) expect(verseWords.has(d.normalised)).toBe(false)
  })

  it('has one correct tile per blank', () => {
    for (const i of puzzle.blankIndexes) {
      expect(puzzle.tiles.filter((t) => !t.isDistractor && t.normalised === puzzle.tokens[i].normalised).length).toBeGreaterThan(0)
    }
  })

  it('fills blanks with correct tiles and rejects wrong ones without placing them', () => {
    let state = initialMissingWordsState(puzzle)
    const distractor = puzzle.tiles.find((t) => t.isDistractor)!
    const wrong = placeTile(puzzle, state, distractor.id)
    expect(wrong.result).toBe('wrong')
    expect(wrong.state.filled).toEqual({})
    expect(wrong.state.mistakes).toBe(1)
    state = wrong.state

    for (const i of puzzle.blankIndexes) {
      const tile = puzzle.tiles.find((t) => !t.isDistractor && t.normalised === puzzle.tokens[i].normalised)!
      const r = placeTile(puzzle, state, tile.id)
      expect(r.result).toBe('correct')
      state = r.state
    }
    expect(isMissingWordsComplete(puzzle, state)).toBe(true)
    expect(state.activeBlank).toBeNull()
    // First blank had a mistake, second was right first time.
    expect(missingWordsCorrectFirstTry(puzzle, state)).toBe(1)
  })

  it('hint highlights the correct tile and marks the blank as assisted', () => {
    const state = applyMissingWordsHint(puzzle, initialMissingWordsState(puzzle))
    const tile = puzzle.tiles.find((t) => t.id === state.hintTileId)!
    expect(tile.normalised).toBe(puzzle.tokens[puzzle.blankIndexes[0]].normalised)
    expect(state.hintsUsed).toBe(1)
    expect(state.assisted).toEqual([puzzle.blankIndexes[0]])
  })

  it('lets the player pick which blank to fill', () => {
    const second = puzzle.blankIndexes[1]
    const state = selectBlank(puzzle, initialMissingWordsState(puzzle), second)
    expect(state.activeBlank).toBe(second)
  })

  it('treats duplicate words as interchangeable', () => {
    const p = createMissingWordsPuzzle('Word Word Word Word Word Word Word Word', [], createSeededRandom(3))
    let state = initialMissingWordsState(p)
    for (const tile of [...p.tiles].reverse()) state = placeTile(p, state, tile.id).state
    expect(isMissingWordsComplete(p, state)).toBe(true)
    expect(missingWordsCorrectFirstTry(p, state)).toBe(p.blankIndexes.length)
  })
})

describe('Word Order', () => {
  const puzzle = createWordOrderPuzzle(JOHN, createSeededRandom(7))
  const solveFrom = (p: WordOrderPuzzle, s: WordOrderState) => {
    // Place tiles in canonical order by matching words.
    for (const token of p.tokens) {
      const id = s.pool.find((tid) => p.tokens[Number(tid.slice(1))].normalised === token.normalised)!
      s = moveToAnswer(s, id)
    }
    return s
  }

  it('starts shuffled with one tile per word and unique ids', () => {
    expect(puzzle.startingPool).toHaveLength(puzzle.tokens.length)
    expect(new Set(puzzle.startingPool).size).toBe(puzzle.tokens.length)
    expect(checkPositions(puzzle, puzzle.startingPool).every(Boolean)).toBe(false)
  })

  it('never starts already solved, even for a two-word verse', () => {
    for (let seed = 0; seed < 20; seed++) {
      const p = createWordOrderPuzzle('Rejoice evermore.', createSeededRandom(seed))
      expect(p.startingPool).toEqual(['w1', 'w0'])
    }
  })

  it('solves when every word is in order, accepting swapped duplicate words', () => {
    let s = solveFrom(puzzle, initialWordOrderState(puzzle))
    // Swap the two identical "Word" tiles: still correct.
    const words = s.answer.filter((id) => puzzle.tokens[Number(id.slice(1))].text === 'Word')
    expect(words.length).toBe(2)
    s = { ...s, answer: s.answer.map((id) => (id === words[0] ? words[1] : id === words[1] ? words[0] : id)) }
    s = checkWordOrder(puzzle, s)
    expect(isWordOrderSolved(puzzle, s)).toBe(true)
    expect(s.correctAtFirstCheck).toBe(puzzle.tokens.length)
    expect(s.mistakes).toBe(0)
  })

  it('records accuracy at the first check, then lets the player fix mistakes', () => {
    let s = initialWordOrderState(puzzle)
    for (const id of puzzle.startingPool) s = moveToAnswer(s, id) // shuffled order
    s = checkWordOrder(puzzle, s)
    const first = s.correctAtFirstCheck!
    expect(first).toBeLessThan(puzzle.tokens.length)
    expect(s.mistakes).toBe(1)
    s = returnWrongTiles(puzzle, s)
    expect(checkPositions(puzzle, s.answer).every(Boolean)).toBe(true)
    s = checkWordOrder(puzzle, applyHintsUntilDone(puzzle, s))
    expect(isWordOrderSolved(puzzle, s)).toBe(true)
    expect(s.correctAtFirstCheck).toBe(first)
  })

  it('supports tap back to pool, reordering, undo and reset', () => {
    let s = initialWordOrderState(puzzle)
    const [a, b] = puzzle.startingPool
    s = moveToAnswer(s, a)
    s = moveToAnswer(s, b)
    expect(s.answer).toEqual([a, b])
    s = moveWithinAnswer(s, b, 0)
    expect(s.answer).toEqual([b, a])
    s = moveToAnswer(s, puzzle.startingPool[2], 1)
    expect(s.answer).toEqual([b, puzzle.startingPool[2], a])
    s = moveToPool(s, a)
    expect(s.pool).toContain(a)
    s = undo(s)
    expect(s.answer).toEqual([b, puzzle.startingPool[2], a])
    s = resetWordOrder(puzzle, s)
    expect(s.answer).toEqual([])
    expect(s.pool).toEqual(puzzle.startingPool)
  })

  it('hint removes wrong tiles and places the next correct word; hinted tiles are not counted', () => {
    let s = initialWordOrderState(puzzle)
    const wrongFirst = puzzle.startingPool.find((id) => puzzle.tokens[Number(id.slice(1))].normalised !== 'in')!
    s = moveToAnswer(s, wrongFirst)
    s = applyWordOrderHint(puzzle, s)
    expect(s.answer).toHaveLength(1)
    expect(puzzle.tokens[Number(s.answer[0].slice(1))].normalised).toBe('in')
    expect(s.hintsUsed).toBe(1)
    s = checkWordOrder(puzzle, solveFrom(puzzle, s))
    expect(isWordOrderSolved(puzzle, s)).toBe(true)
    expect(s.correctAtFirstCheck).toBe(puzzle.tokens.length - 1)
  })
})

function applyHintsUntilDone(p: WordOrderPuzzle, s: WordOrderState): WordOrderState {
  while (s.answer.length < p.tokens.length) s = applyWordOrderHint(p, s)
  return s
}

describe('game rules', () => {
  it('recommends a game by learning state (spec Screen 6)', () => {
    expect(recommendGame('new')).toBe('missing-words')
    expect(recommendGame('growing')).toBe('word-order')
    expect(recommendGame('strong')).toBe('recall')
  })
  it('follows the learning sequence (spec §9.2)', () => {
    expect(nextInSequence('missing-words')).toBe('word-order')
    expect(nextInSequence('word-order')).toBe('recall')
    expect(nextInSequence('recall')).toBeNull()
  })
  it('calculates accuracy and bands', () => {
    expect(assistedAccuracy(3, 4)).toBe(0.75)
    expect(assistedAccuracy(0, 0)).toBe(0)
    expect(accuracyBand(0.59)).toBe('keep-practising')
    expect(accuracyBand(0.6)).toBe('good')
    expect(accuracyBand(0.849)).toBe('excellent') // rounds to 85%
    expect(accuracyBand(0.84)).toBe('good')
  })
})

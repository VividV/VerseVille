/**
 * Missing Words game rules (spec Screen 7). Pure functions — no React.
 *
 * Some words of the verse become blanks. The player fills the active blank by
 * choosing a word tile. A wrong tile never sticks (no punishment), but that blank
 * no longer counts as "correct first try". A hint highlights the right tile and
 * also means the blank was assisted.
 */
import type { VerseToken } from '../../types/games'
import { pickRandom, shuffle, type RandomFn } from '../../utils/random'
import { COMMON_WORDS, tokeniseVerse } from './verseTokens'

export interface WordTile {
  id: string
  /** Word as shown on the tile, without punctuation: "shepherd" */
  label: string
  normalised: string
  isDistractor: boolean
}

export interface MissingWordsPuzzle {
  tokens: VerseToken[]
  /** Token indexes that are blanks, in verse order. */
  blankIndexes: number[]
  /** Answer tiles, shuffled: one per blank plus distractors. */
  tiles: WordTile[]
}

export interface MissingWordsState {
  /** blank token index → tile id placed there */
  filled: Record<number, string>
  /** Blanks where the player made a mistake or used a hint. */
  assisted: number[]
  /** Blank the player is currently filling, or null when finished. */
  activeBlank: number | null
  hintsUsed: number
  mistakes: number
  /** Tile highlighted by the last hint. */
  hintTileId: string | null
}

export type PlaceResult = 'correct' | 'wrong' | 'ignored'

/** How many blanks for a verse of this length: about a quarter of the words, 1–6. */
export function blankCountFor(wordCount: number): number {
  return Math.min(6, Math.max(1, Math.round(wordCount * 0.25)))
}

/**
 * Builds a puzzle.
 * @param distractorPool words from OTHER verses to use as wrong options.
 */
export function createMissingWordsPuzzle(text: string, distractorPool: string[], random: RandomFn): MissingWordsPuzzle {
  const tokens = tokeniseVerse(text)
  const wanted = blankCountFor(tokens.length)

  // Prefer meaningful words (not "the", "and", ...) of 3+ letters as blanks.
  const meaningful = tokens.filter((t) => t.normalised.length >= 3 && !COMMON_WORDS.has(t.normalised))
  const fallback = tokens.filter((t) => !meaningful.includes(t))
  const chosen = [...pickRandom(meaningful, wanted, random)]
  if (chosen.length < wanted) chosen.push(...pickRandom(fallback, wanted - chosen.length, random))
  const blankIndexes = chosen.map((t) => t.index).sort((a, b) => a - b)

  const answerTiles: WordTile[] = blankIndexes.map((i) => ({
    id: `answer-${i}`,
    label: tokens[i].word,
    normalised: tokens[i].normalised,
    isDistractor: false,
  }))

  // Distractors must never be a word that appears anywhere in this verse,
  // so no distractor could also be a correct answer (spec: no ambiguous answers).
  const verseWords = new Set(tokens.map((t) => t.normalised))
  const seen = new Set<string>()
  const candidates: { label: string; normalised: string }[] = []
  for (const raw of distractorPool) {
    const [t] = tokeniseVerse(raw)
    if (!t || t.normalised.length < 3 || COMMON_WORDS.has(t.normalised)) continue
    if (verseWords.has(t.normalised) || seen.has(t.normalised)) continue
    seen.add(t.normalised)
    candidates.push({ label: t.word, normalised: t.normalised })
  }
  const distractorCount = Math.min(4, Math.max(2, blankIndexes.length))
  const distractors: WordTile[] = pickRandom(candidates, distractorCount, random).map((c, i) => ({
    id: `distractor-${i}`,
    label: c.label,
    normalised: c.normalised,
    isDistractor: true,
  }))

  return { tokens, blankIndexes, tiles: shuffle([...answerTiles, ...distractors], random) }
}

export function initialMissingWordsState(puzzle: MissingWordsPuzzle): MissingWordsState {
  return {
    filled: {},
    assisted: [],
    activeBlank: puzzle.blankIndexes[0] ?? null,
    hintsUsed: 0,
    mistakes: 0,
    hintTileId: null,
  }
}

function usedTileIds(state: MissingWordsState): Set<string> {
  return new Set(Object.values(state.filled))
}

function nextOpenBlank(puzzle: MissingWordsPuzzle, filled: Record<number, string>, after: number | null): number | null {
  const open = puzzle.blankIndexes.filter((i) => filled[i] === undefined)
  if (open.length === 0) return null
  return open.find((i) => after === null || i > after) ?? open[0]
}

/** Lets the player choose which open blank to fill next. */
export function selectBlank(puzzle: MissingWordsPuzzle, state: MissingWordsState, blankIndex: number): MissingWordsState {
  if (!puzzle.blankIndexes.includes(blankIndex) || state.filled[blankIndex] !== undefined) return state
  return { ...state, activeBlank: blankIndex, hintTileId: null }
}

/**
 * Tries a tile in the active blank. Any tile whose word matches is correct, so
 * two tiles with the same word are interchangeable.
 */
export function placeTile(
  puzzle: MissingWordsPuzzle,
  state: MissingWordsState,
  tileId: string,
): { state: MissingWordsState; result: PlaceResult } {
  const blank = state.activeBlank
  const tile = puzzle.tiles.find((t) => t.id === tileId)
  if (blank === null || !tile || usedTileIds(state).has(tileId)) return { state, result: 'ignored' }

  if (tile.normalised === puzzle.tokens[blank].normalised) {
    const filled = { ...state.filled, [blank]: tileId }
    return {
      state: { ...state, filled, activeBlank: nextOpenBlank(puzzle, filled, blank), hintTileId: null },
      result: 'correct',
    }
  }
  return {
    state: {
      ...state,
      mistakes: state.mistakes + 1,
      assisted: state.assisted.includes(blank) ? state.assisted : [...state.assisted, blank],
    },
    result: 'wrong',
  }
}

/** Highlights a correct tile for the active blank. */
export function applyMissingWordsHint(puzzle: MissingWordsPuzzle, state: MissingWordsState): MissingWordsState {
  const blank = state.activeBlank
  if (blank === null) return state
  const used = usedTileIds(state)
  const tile = puzzle.tiles.find((t) => !used.has(t.id) && t.normalised === puzzle.tokens[blank].normalised)
  if (!tile) return state
  return {
    ...state,
    hintsUsed: state.hintsUsed + 1,
    hintTileId: tile.id,
    assisted: state.assisted.includes(blank) ? state.assisted : [...state.assisted, blank],
  }
}

export function isMissingWordsComplete(puzzle: MissingWordsPuzzle, state: MissingWordsState): boolean {
  return puzzle.blankIndexes.every((i) => state.filled[i] !== undefined)
}

export function missingWordsCorrectFirstTry(puzzle: MissingWordsPuzzle, state: MissingWordsState): number {
  return puzzle.blankIndexes.filter((i) => !state.assisted.includes(i)).length
}

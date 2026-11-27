/**
 * Word Order game rules (spec Screen 8). Pure functions — no React.
 *
 * Every word of the verse becomes a tile with its punctuation attached. Repeated
 * words are separate tiles with unique ids. The player moves tiles from the pool
 * into the answer line. When the pool is empty the answer is checked against the
 * verse; any tile with the right word in a position counts as correct, so two
 * identical words ("the", "the") are interchangeable.
 */
import type { VerseToken } from '../../types/games'
import { shuffle, type RandomFn } from '../../utils/random'
import { tokeniseVerse } from './verseTokens'

export interface WordOrderPuzzle {
  tokens: VerseToken[] // canonical order
  /** Tile ids in the shuffled starting order. */
  startingPool: string[]
}

export interface WordOrderSnapshot {
  pool: string[]
  answer: string[]
}

export interface WordOrderState extends WordOrderSnapshot {
  /** Earlier snapshots, for Undo. */
  history: WordOrderSnapshot[]
  hintsUsed: number
  /** Tiles placed by a hint (they don't count as correct first try). */
  hintedTileIds: string[]
  /** How many tiles were right, without hints, the first time the answer was checked. Null until checked. */
  correctAtFirstCheck: number | null
  /** Number of times a full answer was checked and was wrong. */
  mistakes: number
}

export function createWordOrderPuzzle(text: string, random: RandomFn): WordOrderPuzzle {
  const tokens = tokeniseVerse(text)
  const ids = tokens.map((t) => t.id)
  let pool = shuffle(ids, random)
  // Make sure the shuffle isn't already the answer (possible for short verses).
  for (let tries = 0; tries < 10 && ids.length > 1 && isInCanonicalOrder(tokens, pool); tries++) {
    pool = shuffle(ids, random)
  }
  if (ids.length > 1 && isInCanonicalOrder(tokens, pool)) pool = [...pool.slice(1), pool[0]]
  return { tokens, startingPool: pool }
}

function tokenById(puzzle: WordOrderPuzzle, id: string): VerseToken {
  return puzzle.tokens[Number(id.slice(1))]
}

function isInCanonicalOrder(tokens: VerseToken[], ids: string[]): boolean {
  return ids.every((id, i) => tokens[Number(id.slice(1))].normalised === tokens[i].normalised)
}

export function initialWordOrderState(puzzle: WordOrderPuzzle): WordOrderState {
  return {
    pool: [...puzzle.startingPool],
    answer: [],
    history: [],
    hintsUsed: 0,
    hintedTileIds: [],
    correctAtFirstCheck: null,
    mistakes: 0,
  }
}

function withHistory(state: WordOrderState, next: WordOrderSnapshot): WordOrderState {
  return { ...state, ...next, history: [...state.history, { pool: state.pool, answer: state.answer }] }
}

/** Moves a tile from the pool into the answer line (at the end, or before position `insertAt`). */
export function moveToAnswer(state: WordOrderState, tileId: string, insertAt?: number): WordOrderState {
  if (!state.pool.includes(tileId)) return state
  const answer = [...state.answer]
  const at = insertAt === undefined ? answer.length : Math.min(Math.max(insertAt, 0), answer.length)
  answer.splice(at, 0, tileId)
  return withHistory(state, { pool: state.pool.filter((id) => id !== tileId), answer })
}

/** Moves a tile already in the answer line to a new position. */
export function moveWithinAnswer(state: WordOrderState, tileId: string, insertAt: number): WordOrderState {
  const from = state.answer.indexOf(tileId)
  if (from === -1) return state
  const answer = state.answer.filter((id) => id !== tileId)
  const target = Math.min(Math.max(from < insertAt ? insertAt - 1 : insertAt, 0), answer.length)
  answer.splice(target, 0, tileId)
  if (answer.every((id, i) => id === state.answer[i])) return state
  return withHistory(state, { pool: state.pool, answer })
}

/** Moves a tile from the answer line back to the pool. */
export function moveToPool(state: WordOrderState, tileId: string): WordOrderState {
  if (!state.answer.includes(tileId)) return state
  return withHistory(state, { pool: [...state.pool, tileId], answer: state.answer.filter((id) => id !== tileId) })
}

export function undo(state: WordOrderState): WordOrderState {
  const previous = state.history[state.history.length - 1]
  if (!previous) return state
  return { ...state, ...previous, history: state.history.slice(0, -1) }
}

/** Puts every tile back in its starting place. Hints and checks already made still count. */
export function resetWordOrder(puzzle: WordOrderPuzzle, state: WordOrderState): WordOrderState {
  if (state.answer.length === 0) return state
  return withHistory(state, { pool: [...puzzle.startingPool], answer: [] })
}

/** For each answer position: is the right word there? */
export function checkPositions(puzzle: WordOrderPuzzle, answer: string[]): boolean[] {
  return answer.map((id, i) => i < puzzle.tokens.length && tokenById(puzzle, id).normalised === puzzle.tokens[i].normalised)
}

/** Length of the correct start of the answer. */
function correctPrefixLength(puzzle: WordOrderPuzzle, answer: string[]): number {
  const ok = checkPositions(puzzle, answer)
  const firstWrong = ok.indexOf(false)
  return firstWrong === -1 ? ok.length : firstWrong
}

/**
 * Hint: returns any tiles after the correct start of the answer to the pool,
 * then places the next correct word.
 */
export function applyWordOrderHint(puzzle: WordOrderPuzzle, state: WordOrderState): WordOrderState {
  const keep = correctPrefixLength(puzzle, state.answer)
  if (keep >= puzzle.tokens.length) return state
  const returned = state.answer.slice(keep)
  const pool = [...state.pool, ...returned]
  const needed = puzzle.tokens[keep].normalised
  const tileId = pool.find((id) => tokenById(puzzle, id).normalised === needed)!
  const next = withHistory(state, { pool: pool.filter((id) => id !== tileId), answer: [...state.answer.slice(0, keep), tileId] })
  return { ...next, hintsUsed: state.hintsUsed + 1, hintedTileIds: [...state.hintedTileIds, tileId] }
}

export function isAnswerFull(puzzle: WordOrderPuzzle, state: WordOrderState): boolean {
  return state.answer.length === puzzle.tokens.length
}

export function isWordOrderSolved(puzzle: WordOrderPuzzle, state: WordOrderState): boolean {
  return isAnswerFull(puzzle, state) && checkPositions(puzzle, state.answer).every(Boolean)
}

/**
 * Checks a full answer. The first check records how many tiles were right
 * without hints; that becomes the game's accuracy.
 */
export function checkWordOrder(puzzle: WordOrderPuzzle, state: WordOrderState): WordOrderState {
  if (!isAnswerFull(puzzle, state)) return state
  const ok = checkPositions(puzzle, state.answer)
  const solved = ok.every(Boolean)
  const correctAtFirstCheck =
    state.correctAtFirstCheck ?? ok.filter((good, i) => good && !state.hintedTileIds.includes(state.answer[i])).length
  return { ...state, correctAtFirstCheck, mistakes: solved ? state.mistakes : state.mistakes + 1 }
}

/**
 * Keeps the correct start of the answer and sends every tile from the first
 * mistake onward back to the pool. (Removing only the wrong tiles would shift
 * later tiles out of place.)
 */
export function returnWrongTiles(puzzle: WordOrderPuzzle, state: WordOrderState): WordOrderState {
  const keep = correctPrefixLength(puzzle, state.answer)
  if (keep === state.answer.length) return state
  return withHistory(state, {
    pool: [...state.pool, ...state.answer.slice(keep)],
    answer: state.answer.slice(0, keep),
  })
}

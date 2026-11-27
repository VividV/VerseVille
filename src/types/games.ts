export type GameType = 'missing-words' | 'word-order' | 'recall'

/** One word of a verse, with its punctuation kept attached (spec Screen 8). */
export interface VerseToken {
  /** Unique id, e.g. "w3". Repeated words get different ids. */
  id: string
  /** Position in the verse, starting at 0. */
  index: number
  /** The word exactly as printed, including punctuation: "shepherd;" */
  text: string
  /** Leading punctuation, the word itself, trailing punctuation: "", "shepherd", ";" */
  prefix: string
  word: string
  suffix: string
  /** Lowercase, punctuation-free form used for comparing answers: "shepherd" */
  normalised: string
}

/** One step of a recall comparison (spec §9.3). */
export type RecallDiff =
  | { type: 'correct'; expected: string; actual: string }
  | { type: 'wrong'; expected: string; actual: string }
  | { type: 'missing'; expected: string }
  | { type: 'extra'; actual: string }

export interface RecallScore {
  /** 0–1. Correct words divided by (verse words + extra words typed). */
  accuracy: number
  correctWords: number
  totalWords: number
  missingWords: number
  wrongWords: number
  extraWords: number
  diff: RecallDiff[]
}

/** Details kept with a finished game, used by the completion screen. */
export type GameDetails =
  | { kind: 'assisted'; totalItems: number; correctFirstTry: number; hintsUsed: number; mistakes: number }
  | { kind: 'recall'; score: RecallScore; attempt: string }

/** A finished game (spec §8 game_sessions). */
export interface GameSession {
  id: string
  scriptureId: string
  gameType: GameType
  /** 0–100 */
  score: number
  /** 0–1 */
  accuracy: number
  durationSeconds: number
  completedAt: string
  /** Set by the reward engine (Phase 5) once rewards for this session are granted. */
  rewardsGranted: boolean
  details: GameDetails
}

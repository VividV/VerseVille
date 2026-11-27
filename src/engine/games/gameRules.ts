/** Shared game rules: recommendations, the learning sequence, accuracy and feedback. */
import type { GameType } from '../../types/games'

export const GAME_INFO: Record<GameType, { name: string; icon: string; description: string; path: string }> = {
  'missing-words': {
    name: 'Missing Words',
    icon: '🧩',
    description: 'Fill in the blanks with the right words.',
    path: 'missing-words',
  },
  'word-order': {
    name: 'Word Order',
    icon: '🔀',
    description: 'Put the shuffled words back in order.',
    path: 'word-order',
  },
  recall: {
    name: 'Verse Recall',
    icon: '🧠',
    description: 'Type the whole verse from memory.',
    path: 'recall',
  },
}

export { LEARNING_SEQUENCE } from '../memorisation/learningEngine'

export function gamePath(gameType: GameType, scriptureId: string): string {
  return `/games/${GAME_INFO[gameType].path}/${scriptureId}`
}

/** Accuracy (0–1) for the assisted games: items right first time, without a hint. */
export function assistedAccuracy(correctFirstTry: number, totalItems: number): number {
  if (totalItems <= 0) return 0
  return Math.min(1, Math.max(0, correctFirstTry / totalItems))
}

/** 0–1 accuracy as a whole-number percentage. */
export function toPercent(accuracy: number): number {
  return Math.round(accuracy * 100)
}

/** Result bands from spec §10: below 60%, 60–84%, 85% and above. */
export type AccuracyBand = 'keep-practising' | 'good' | 'excellent'

export function accuracyBand(accuracy: number): AccuracyBand {
  const percent = toPercent(accuracy)
  if (percent >= 85) return 'excellent'
  if (percent >= 60) return 'good'
  return 'keep-practising'
}

export const BAND_MESSAGES: Record<AccuracyBand, { title: string; message: string }> = {
  excellent: { title: 'Beautifully done!', message: 'This verse is taking root in your heart.' },
  good: { title: 'Well done!', message: 'You are growing. A little more practice will make it strong.' },
  'keep-practising': {
    title: 'Every try helps',
    message: "Forgetting is part of remembering. Read the verse again and give it another go — there's no penalty.",
  },
}

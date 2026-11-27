import type { GameDetails, GameSession, GameType } from '../../types/games'
import { createId } from '../../utils/idUtils'
import { toPercent } from './gameRules'

/** Builds the record of a finished game (spec §8 game_sessions). */
export function createGameSession(input: {
  scriptureId: string
  gameType: GameType
  accuracy: number
  details: GameDetails
  startedAt: Date
  now?: Date
}): GameSession {
  const now = input.now ?? new Date()
  const accuracy = Math.min(1, Math.max(0, input.accuracy))
  return {
    id: createId(),
    scriptureId: input.scriptureId,
    gameType: input.gameType,
    score: toPercent(accuracy),
    accuracy,
    durationSeconds: Math.max(0, Math.round((now.getTime() - input.startedAt.getTime()) / 1000)),
    completedAt: now.toISOString(),
    rewardsGranted: false,
    details: input.details,
  }
}

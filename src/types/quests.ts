/** Game events that move quests forward (spec §14). */
export type QuestEventType =
  | 'scripture_started'
  | 'scripture_learned'
  | 'scripture_review_completed'
  | 'recall_completed'
  | 'scripture_mastered'
  | 'daily_goal_completed'

/** A quest in the catalogue (src/data/quests.json). */
export interface QuestDefinition {
  id: string
  name: string
  description: string
  eventType: QuestEventType
  target: number
  coinReward: number
  xpReward: number
  icon: string
}

/** One of the player's quests for one day (spec §8 daily_quests). */
export interface DailyQuest {
  /** "<date>:<questId>", unique per player, quest and day. */
  id: string
  questId: string
  questDate: string // local YYYY-MM-DD
  progress: number
  target: number
  completedAt: string | null
  rewardClaimed: boolean
}

/** What the player did on one local day: used for the daily goal and the streak. */
export interface DayRecord {
  date: string
  /** Scriptures with at least one successful game that day. */
  studiedScriptureIds: string[]
  goalCompletedAt: string | null
}

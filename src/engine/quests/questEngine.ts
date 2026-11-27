/**
 * Daily quests and the daily goal (spec §14, §11.3). Pure functions.
 *
 * Quest progress only ever comes from real learning events reported by the
 * learning engine — never from opening screens or tapping buttons.
 */
import questsJson from '../../data/quests.json'
import type { DailyQuest, DayRecord, QuestDefinition, QuestEventType } from '../../types/quests'
import type { RewardTransaction } from '../../types/rewards'
import type { LearningEvents } from '../memorisation/learningEngine'
import { addLocalDays, toLocalDateKey } from '../../utils/dateUtils'

export const QUESTS = questsJson as QuestDefinition[]
const BY_ID = new Map(QUESTS.map((q) => [q.id, q]))

export const DAILY_GOAL_SEEDS = 1

export function getQuest(id: string): QuestDefinition | undefined {
  return BY_ID.get(id)
}

/**
 * Today's three quests. Always achievable in a few minutes:
 * the daily goal, one recall, and a review quest only if reviews are actually due.
 */
export function chooseDailyQuestIds(dueReviewCount: number): string[] {
  const third = dueReviewCount >= 2 ? 'review_two_scriptures' : dueReviewCount === 1 ? 'review_one_scripture' : 'learn_one_scripture'
  return ['complete_daily_goal', 'recall_challenge', third]
}

export function createDailyQuests(date: string, questIds: string[]): DailyQuest[] {
  return questIds.map((questId) => ({
    id: `${date}:${questId}`,
    questId,
    questDate: date,
    progress: 0,
    target: getQuest(questId)!.target,
    completedAt: null,
    rewardClaimed: false,
  }))
}

/** Converts what the learning engine reported into quest events. */
export function questEventsFrom(events: LearningEvents, dailyGoalJustCompleted: boolean): QuestEventType[] {
  const out: QuestEventType[] = []
  if (events.scriptureStarted) out.push('scripture_started')
  if (events.scriptureLearned) out.push('scripture_learned')
  if (events.reviewCompleted) out.push('scripture_review_completed')
  if (events.recallCompleted) out.push('recall_completed')
  if (events.scriptureMastered) out.push('scripture_mastered')
  if (dailyGoalJustCompleted) out.push('daily_goal_completed')
  return out
}

/** Moves quests forward. Progress never goes past the target; completed quests stay completed. */
export function applyQuestEvents(
  quests: DailyQuest[],
  events: QuestEventType[],
  now: Date,
): { quests: DailyQuest[]; changed: DailyQuest[]; newlyCompleted: DailyQuest[] } {
  const changed: DailyQuest[] = []
  const newlyCompleted: DailyQuest[] = []
  const updated = quests.map((q) => {
    const def = getQuest(q.questId)
    if (!def || q.completedAt) return q
    const count = events.filter((e) => e === def.eventType).length
    if (count === 0) return q
    const progress = Math.min(q.target, q.progress + count)
    const next = { ...q, progress, completedAt: progress >= q.target ? now.toISOString() : null }
    changed.push(next)
    if (next.completedAt) newlyCompleted.push(next)
    return next
  })
  return { quests: updated, changed, newlyCompleted }
}

/** Reward for claiming a completed quest. The id makes it claimable only once. */
export function questRewardTransaction(quest: DailyQuest, now: Date): RewardTransaction {
  const def = getQuest(quest.questId)!
  return {
    id: `quest:${quest.id}`,
    sourceType: 'quest',
    sourceId: quest.questId,
    sessionId: null,
    coinsDelta: def.coinReward,
    seedsDelta: 0,
    gemsDelta: 0,
    xpDelta: def.xpReward,
    label: `Quest: ${def.name}`,
    createdAt: now.toISOString(),
  }
}

export function canClaim(quest: DailyQuest): boolean {
  return quest.completedAt !== null && !quest.rewardClaimed
}

export function emptyDay(date: string): DayRecord {
  return { date, studiedScriptureIds: [], goalCompletedAt: null }
}

/**
 * Records a finished game in the day's record. A scripture counts towards the
 * daily goal when the player has a successful game on it that day.
 */
export function recordStudy(
  day: DayRecord,
  scriptureId: string,
  successful: boolean,
  dailyGoal: number,
  now: Date,
): { day: DayRecord; goalJustCompleted: boolean } {
  if (!successful || day.studiedScriptureIds.includes(scriptureId)) return { day, goalJustCompleted: false }
  const studied = [...day.studiedScriptureIds, scriptureId]
  const reached = day.goalCompletedAt === null && studied.length >= dailyGoal
  return {
    day: { ...day, studiedScriptureIds: studied, goalCompletedAt: reached ? now.toISOString() : day.goalCompletedAt },
    goalJustCompleted: reached,
  }
}

/** The automatic seed for completing the daily learning goal (spec §11.3). */
export function dailyGoalTransaction(date: string, now: Date): RewardTransaction {
  return {
    id: `daily-goal:${date}`,
    sourceType: 'daily-goal',
    sourceId: date,
    sessionId: null,
    coinsDelta: 0,
    seedsDelta: DAILY_GOAL_SEEDS,
    gemsDelta: 0,
    xpDelta: 0,
    label: 'Daily goal complete',
    createdAt: now.toISOString(),
  }
}

/**
 * Days in a row with at least one successful game, ending today — or yesterday,
 * so the streak isn't shown as broken before the player has had a chance today.
 */
export function currentStreak(days: Record<string, DayRecord>, now: Date): number {
  const studied = (d: Date) => (days[toLocalDateKey(d)]?.studiedScriptureIds.length ?? 0) > 0
  let cursor = studied(now) ? now : addLocalDays(now, -1)
  let streak = 0
  while (studied(cursor)) {
    streak++
    cursor = addLocalDays(cursor, -1)
  }
  return streak
}

/** The local date a game counts towards: the day it was started (so midnight doesn't reset it mid-game). */
export function questDateForSession(completedAt: Date, durationSeconds: number): string {
  return toLocalDateKey(new Date(completedAt.getTime() - durationSeconds * 1000))
}

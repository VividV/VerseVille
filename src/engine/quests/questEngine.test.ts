import { describe, expect, it } from 'vitest'
import type { LearningEvents } from '../memorisation/learningEngine'
import {
  QUESTS,
  applyQuestEvents,
  canClaim,
  chooseDailyQuestIds,
  createDailyQuests,
  currentStreak,
  dailyGoalTransaction,
  emptyDay,
  questDateForSession,
  questEventsFrom,
  questRewardTransaction,
  recordStudy,
} from './questEngine'

const none: LearningEvents = { scriptureStarted: false, scriptureLearned: false, reviewCompleted: false, recallCompleted: false, scriptureMastered: false }
const now = new Date('2026-11-27T10:00:00')

describe('quest catalogue', () => {
  it('rewards 10–20 XP and some coins per quest (spec §11)', () => {
    for (const q of QUESTS) {
      expect(q.xpReward).toBeGreaterThanOrEqual(10)
      expect(q.xpReward).toBeLessThanOrEqual(20)
      expect(q.coinReward).toBeGreaterThan(0)
    }
  })
})

describe('choosing daily quests', () => {
  it('only offers review quests when reviews are due', () => {
    expect(chooseDailyQuestIds(0)).toEqual(['complete_daily_goal', 'recall_challenge', 'learn_one_scripture'])
    expect(chooseDailyQuestIds(1)).toContain('review_one_scripture')
    expect(chooseDailyQuestIds(5)).toContain('review_two_scriptures')
  })
  it('creates one quest per id for the date', () => {
    const q = createDailyQuests('2026-11-27', ['review_two_scriptures'])
    expect(q).toEqual([
      { id: '2026-11-27:review_two_scriptures', questId: 'review_two_scriptures', questDate: '2026-11-27', progress: 0, target: 2, completedAt: null, rewardClaimed: false },
    ])
  })
})

describe('quest progress from game events (spec §14)', () => {
  it('maps learning events to quest events', () => {
    expect(questEventsFrom({ ...none, reviewCompleted: true, recallCompleted: true }, true)).toEqual([
      'scripture_review_completed',
      'recall_completed',
      'daily_goal_completed',
    ])
  })

  it('moves only matching quests, completes at the target and never overshoots', () => {
    let quests = createDailyQuests('2026-11-27', ['review_two_scriptures', 'recall_challenge'])
    let r = applyQuestEvents(quests, ['scripture_review_completed'], now)
    expect(r.quests[0].progress).toBe(1)
    expect(r.quests[0].completedAt).toBeNull()
    expect(r.quests[1].progress).toBe(0)
    quests = r.quests
    r = applyQuestEvents(quests, ['scripture_review_completed', 'scripture_review_completed', 'recall_completed'], now)
    expect(r.quests[0]).toMatchObject({ progress: 2, completedAt: now.toISOString() })
    expect(r.newlyCompleted.map((q) => q.questId)).toEqual(['review_two_scriptures', 'recall_challenge'])
    // Completed quests don't change again.
    expect(applyQuestEvents(r.quests, ['scripture_review_completed'], now).changed).toEqual([])
  })

  it('can claim a completed quest once', () => {
    const [q] = applyQuestEvents(createDailyQuests('2026-11-27', ['recall_challenge']), ['recall_completed'], now).quests
    expect(canClaim(q)).toBe(true)
    expect(canClaim({ ...q, rewardClaimed: true })).toBe(false)
    expect(questRewardTransaction(q, now)).toMatchObject({ id: 'quest:2026-11-27:recall_challenge', xpDelta: 15, coinsDelta: 10 })
  })
})

describe('daily goal and streak', () => {
  it('counts distinct scriptures with a successful game and completes the goal once', () => {
    let day = emptyDay('2026-11-27')
    day = recordStudy(day, 'a', true, 2, now).day
    day = recordStudy(day, 'a', true, 2, now).day // same verse again
    expect(day.studiedScriptureIds).toEqual(['a'])
    expect(recordStudy(day, 'b', false, 2, now).day.studiedScriptureIds).toEqual(['a']) // unsuccessful doesn't count
    const r = recordStudy(day, 'b', true, 2, now)
    expect(r.goalJustCompleted).toBe(true)
    expect(recordStudy(r.day, 'c', true, 2, now).goalJustCompleted).toBe(false)
    expect(dailyGoalTransaction('2026-11-27', now)).toMatchObject({ id: 'daily-goal:2026-11-27', seedsDelta: 1 })
  })

  it('counts days in a row, not breaking the streak before today is over', () => {
    const studied = (date: string) => ({ date, studiedScriptureIds: ['x'], goalCompletedAt: null })
    const days = { '2026-11-24': studied('2026-11-24'), '2026-11-25': studied('2026-11-25'), '2026-11-26': studied('2026-11-26') }
    expect(currentStreak(days, now)).toBe(3) // today not yet studied
    expect(currentStreak({ ...days, '2026-11-27': studied('2026-11-27') }, now)).toBe(4)
    expect(currentStreak({ '2026-11-24': studied('2026-11-24') }, now)).toBe(0)
  })

  it('counts a game towards the day it started (midnight safety)', () => {
    expect(questDateForSession(new Date('2026-11-28T00:01:00'), 180)).toBe('2026-11-27')
    expect(questDateForSession(new Date('2026-11-28T00:05:00'), 60)).toBe('2026-11-28')
  })
})

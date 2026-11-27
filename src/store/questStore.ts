/**
 * Daily quests and day records. Rules live in src/engine/quests/questEngine.ts.
 * Quest progress is updated by gameStore.completeGame (from real game events);
 * this store creates each day's quests and handles claiming rewards.
 */
import { create } from 'zustand'
import type { DailyQuest, DayRecord } from '../types/quests'
import { canClaim, chooseDailyQuestIds, createDailyQuests, questRewardTransaction } from '../engine/quests/questEngine'
import { getDueReviews } from '../engine/memorisation/reviewQueue'
import { applyTransactions } from '../engine/rewards/economy'
import { saveQuestClaim, saveQuests } from '../services/persistence/saveService'
import { toLocalDateKey } from '../utils/dateUtils'
import { useGameStore } from './gameStore'
import { exclusive } from '../services/sync/lock'

interface QuestState {
  /** Every saved quest (all days), so unclaimed rewards from earlier days aren't lost. */
  quests: DailyQuest[]
  days: Record<string, DayRecord>
  /** Creates today's quests if they don't exist yet. */
  ensureQuestsFor: (date: string) => Promise<DailyQuest[]>
  claimQuest: (questInstanceId: string) => Promise<void>
}

/** Today's quests from a list (pure helper for screens). */
export function questsForDate(quests: DailyQuest[], date: string): DailyQuest[] {
  return quests.filter((q) => q.questDate === date)
}

/** Builds (but doesn't save) the quests for a date, based on the reviews due right now. */
export function buildQuestsFor(date: string): DailyQuest[] {
  const due = getDueReviews(useGameStore.getState().scriptureProgress, new Date()).length
  return createDailyQuests(date, chooseDailyQuestIds(due))
}

export const useQuestStore = create<QuestState>()((set, get) => ({
  quests: [],
  days: {},

  ensureQuestsFor: (date) => exclusive(async () => {
    const existing = questsForDate(get().quests, date)
    if (existing.length > 0) return existing
    const created = buildQuestsFor(date)
    await saveQuests(created)
    // Another call may have created them meanwhile; keep only one set per day.
    if (questsForDate(get().quests, date).length === 0) set({ quests: [...get().quests, ...created] })
    return questsForDate(get().quests, date)
  }),

  claimQuest: (questInstanceId) => exclusive(async () => {
    const quest = get().quests.find((q) => q.id === questInstanceId)
    if (!quest) throw new Error('Quest not found.')
    if (!canClaim(quest)) throw new Error(quest.rewardClaimed ? 'Already claimed.' : 'This quest is not complete yet.')
    const { resources, rewardTransactions } = useGameStore.getState()
    if (!resources) throw new Error('No player profile.')
    if (rewardTransactions.some((t) => t.id === `quest:${quest.id}`)) throw new Error('Already claimed.')
    const now = new Date()
    const transaction = questRewardTransaction(quest, now)
    const newResources = applyTransactions(resources, [transaction], now)
    const claimed = { ...quest, rewardClaimed: true }
    await saveQuestClaim(claimed, transaction, newResources)
    useGameStore.setState({ resources: newResources, rewardTransactions: [...rewardTransactions, transaction] })
    set({ quests: get().quests.map((q) => (q.id === claimed.id ? claimed : q)) })
  }),
}))

export function todayKey(now: Date = new Date()): string {
  return toLocalDateKey(now)
}

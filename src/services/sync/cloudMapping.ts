/**
 * Converts between the app's types and the Supabase table rows (supabase/schema.sql).
 * All timestamps are normalised to JavaScript ISO format so they compare correctly.
 */
import type { PlayerProfile, PlayerSettings } from '../../types/player'
import type { PlayerScripture } from '../../types/scripture'
import type { GameSession } from '../../types/games'
import type { RewardTransaction } from '../../types/rewards'
import type { PlacedGardenItem } from '../../types/garden'
import type { DailyQuest, DayRecord } from '../../types/quests'
import { getItem } from '../../engine/garden/catalog'

type Row = Record<string, unknown>

export const iso = (v: unknown): string => new Date(v as string).toISOString()
export const isoOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : iso(v))

export function profileToRow(p: PlayerProfile, s: PlayerSettings | null, uid: string): Row {
  return {
    id: uid,
    display_name: p.displayName,
    preferred_translation: s?.preferredTranslation ?? 'KJV',
    daily_goal: s?.dailyGoal ?? 3,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }
}
export function rowToProfile(r: Row): PlayerProfile {
  return { id: r.id as string, displayName: r.display_name as string, createdAt: iso(r.created_at), updatedAt: iso(r.updated_at) }
}

export function settingsToRow(s: PlayerSettings, uid: string): Row {
  return {
    player_id: uid,
    sound_enabled: s.soundEnabled,
    notifications_enabled: s.notificationsEnabled,
    daily_goal: s.dailyGoal,
    preferred_translation: s.preferredTranslation,
    text_size: s.textSize,
    high_contrast: s.highContrast,
    reduced_motion: s.reducedMotion,
    updated_at: s.updatedAt ?? '1970-01-01T00:00:00.000Z',
  }
}
export function rowToSettings(r: Row): PlayerSettings {
  return {
    soundEnabled: r.sound_enabled as boolean,
    notificationsEnabled: r.notifications_enabled as boolean,
    dailyGoal: r.daily_goal as PlayerSettings['dailyGoal'],
    preferredTranslation: r.preferred_translation as PlayerSettings['preferredTranslation'],
    textSize: r.text_size as PlayerSettings['textSize'],
    highContrast: r.high_contrast as boolean,
    reducedMotion: r.reduced_motion as boolean,
    updatedAt: iso(r.updated_at),
  }
}

export function progressToRow(p: PlayerScripture, uid: string): Row {
  return {
    player_id: uid,
    scripture_id: p.scriptureId,
    status: p.status,
    mastery_score: p.masteryScore,
    learning_started_at: p.learningStartedAt,
    last_reviewed_at: p.lastReviewedAt,
    next_review_at: p.nextReviewAt,
    consecutive_successes: p.consecutiveSuccesses,
    total_attempts: p.totalAttempts,
    successful_attempts: p.successfulAttempts,
    mastered_at: p.masteredAt,
    extra: {
      completedGameTypes: p.completedGameTypes,
      learnedAt: p.learnedAt,
      intervalStep: p.intervalStep,
      successfulRecallDays: p.successfulRecallDays,
      masteryChangeDays: p.masteryChangeDays,
      reviewsCompleted: p.reviewsCompleted,
    },
    updated_at: p.updatedAt,
  }
}
export function rowToProgress(r: Row): PlayerScripture {
  const extra = (r.extra ?? {}) as Partial<PlayerScripture>
  return {
    scriptureId: r.scripture_id as string,
    status: r.status as PlayerScripture['status'],
    masteryScore: r.mastery_score as number,
    learningStartedAt: iso(r.learning_started_at),
    lastReviewedAt: isoOrNull(r.last_reviewed_at),
    nextReviewAt: isoOrNull(r.next_review_at),
    consecutiveSuccesses: r.consecutive_successes as number,
    totalAttempts: r.total_attempts as number,
    successfulAttempts: r.successful_attempts as number,
    masteredAt: isoOrNull(r.mastered_at),
    completedGameTypes: extra.completedGameTypes ?? [],
    learnedAt: extra.learnedAt ? iso(extra.learnedAt) : null,
    intervalStep: extra.intervalStep ?? 0,
    successfulRecallDays: extra.successfulRecallDays ?? [],
    masteryChangeDays: extra.masteryChangeDays ?? {},
    reviewsCompleted: extra.reviewsCompleted ?? 0,
    updatedAt: iso(r.updated_at),
  }
}

export function sessionToRow(s: GameSession, uid: string): Row {
  return {
    id: s.id,
    player_id: uid,
    scripture_id: s.scriptureId,
    game_type: s.gameType,
    score: s.score,
    accuracy: s.accuracy,
    duration_seconds: s.durationSeconds,
    completed_at: s.completedAt,
    rewards_granted: s.rewardsGranted,
    details: s.details,
  }
}
export function rowToSession(r: Row): GameSession {
  return {
    id: r.id as string,
    scriptureId: r.scripture_id as string,
    gameType: r.game_type as GameSession['gameType'],
    score: r.score as number,
    accuracy: Number(r.accuracy),
    durationSeconds: r.duration_seconds as number,
    completedAt: iso(r.completed_at),
    rewardsGranted: r.rewards_granted as boolean,
    details: r.details as GameSession['details'],
  }
}

export function transactionToRow(t: RewardTransaction): Row {
  return {
    id: t.id,
    source_type: t.sourceType,
    source_id: t.sourceId,
    session_id: t.sessionId,
    coins_delta: t.coinsDelta,
    seeds_delta: t.seedsDelta,
    gems_delta: t.gemsDelta,
    xp_delta: t.xpDelta,
    label: t.label,
    created_at: t.createdAt,
  }
}
export function rowToTransaction(r: Row): RewardTransaction {
  return {
    id: r.id as string,
    sourceType: r.source_type as RewardTransaction['sourceType'],
    sourceId: r.source_id as string,
    sessionId: (r.session_id as string | null) ?? null,
    coinsDelta: r.coins_delta as number,
    seedsDelta: r.seeds_delta as number,
    gemsDelta: r.gems_delta as number,
    xpDelta: r.xp_delta as number,
    label: r.label as string,
    createdAt: iso(r.created_at),
  }
}

export function gardenItemToRow(i: PlacedGardenItem): Row {
  return {
    id: i.id,
    item_type: getItem(i.itemId)?.category ?? 'item',
    item_id: i.itemId,
    grid_x: i.gridX,
    grid_y: i.gridY,
    rotation: i.rotation,
    placed_at: i.placedAt,
  }
}
export function rowToGardenItem(r: Row): PlacedGardenItem {
  return {
    id: r.id as string,
    itemId: r.item_id as string,
    gridX: r.grid_x as number,
    gridY: r.grid_y as number,
    rotation: r.rotation as number,
    placedAt: iso(r.placed_at),
  }
}

export function questToRow(q: DailyQuest, uid: string): Row {
  return {
    player_id: uid,
    quest_id: q.questId,
    quest_date: q.questDate,
    progress: q.progress,
    target: q.target,
    completed_at: q.completedAt,
    reward_claimed: q.rewardClaimed,
  }
}
export function rowToQuest(r: Row): DailyQuest {
  const date = String(r.quest_date).slice(0, 10)
  return {
    id: `${date}:${r.quest_id}`,
    questId: r.quest_id as string,
    questDate: date,
    progress: r.progress as number,
    target: r.target as number,
    completedAt: isoOrNull(r.completed_at),
    rewardClaimed: r.reward_claimed as boolean,
  }
}

export function dayToRow(d: DayRecord, uid: string): Row {
  return { player_id: uid, activity_date: d.date, studied_scripture_ids: d.studiedScriptureIds, goal_completed_at: d.goalCompletedAt }
}
export function rowToDay(r: Row): DayRecord {
  return {
    date: String(r.activity_date).slice(0, 10),
    studiedScriptureIds: (r.studied_scripture_ids as string[]) ?? [],
    goalCompletedAt: isoOrNull(r.goal_completed_at),
  }
}

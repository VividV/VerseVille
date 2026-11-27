/**
 * Merging this device's progress with the cloud (spec §15). Pure and deterministic:
 * the same two inputs always give the same result, in either order of devices.
 *
 *  - Reward transactions and finished games: combined by id (never lost).
 *  - Resources: ALWAYS recalculated as starting resources + every transaction,
 *    so a balance is never simply overwritten.
 *  - Scripture progress: the most recently updated record wins for the current
 *    score and schedule, but history is combined — earliest learned/mastered
 *    dates, all successful recall days, highest counts. Mastered scriptures are
 *    never silently removed.
 *  - Profile, settings and garden layout: the most recent change wins; the garden
 *    is then checked against what was actually bought.
 *  - Quests and daily activity: combined, keeping the furthest progress.
 */
import type { PlayerProfile, PlayerResources, PlayerSettings } from '../../types/player'
import type { PlayerScripture } from '../../types/scripture'
import type { GameSession } from '../../types/games'
import type { RewardTransaction } from '../../types/rewards'
import type { GardenMeta, Inventory, PlacedGardenItem } from '../../types/garden'
import type { DailyQuest, DayRecord } from '../../types/quests'
import { STARTING_RESOURCES } from '../rewards/economy'
import { levelForXp } from '../progression/playerLevel'
import { masteryStatus } from '../memorisation/mastery'
import { getItem } from '../garden/catalog'
import { STARTING_LAYOUT } from '../garden/startingGarden'
import { unlockedRowCount } from '../garden/gardenGrid'

export interface GardenSnapshot {
  items: PlacedGardenItem[]
  inventory: Inventory
  meta: GardenMeta
}

export interface ProgressSnapshot {
  profile: PlayerProfile | null
  settings: PlayerSettings | null
  progress: Record<string, PlayerScripture>
  sessions: GameSession[]
  transactions: RewardTransaction[]
  garden: GardenSnapshot | null
  quests: DailyQuest[]
  days: Record<string, DayRecord>
}

const EPOCH = '1970-01-01T00:00:00.000Z'
const minDate = (a: string | null, b: string | null) => (a && b ? (a < b ? a : b) : (a ?? b))
const maxDate = (a: string | null, b: string | null) => (a && b ? (a > b ? a : b) : (a ?? b))
const union = <T>(a: T[], b: T[]) => [...new Set([...a, ...b])]

function byId<T>(items: T[], id: (t: T) => string): Map<string, T> {
  return new Map(items.map((t) => [id(t), t]))
}

/** Combine two lists keyed by id; `combine` decides when both sides have the same id. */
function mergeById<T>(a: T[], b: T[], id: (t: T) => string, combine: (x: T, y: T) => T = (x) => x): T[] {
  const out = byId(a, id)
  for (const item of b) {
    const key = id(item)
    const existing = out.get(key)
    out.set(key, existing ? combine(existing, item) : item)
  }
  return [...out.values()].sort((x, y) => id(x).localeCompare(id(y)))
}

/** Latest-wins, with this device winning ties. */
function latest<T extends { updatedAt?: string } | null>(local: T, cloud: T): T {
  if (!local) return cloud
  if (!cloud) return local
  return (cloud.updatedAt ?? EPOCH) > (local.updatedAt ?? EPOCH) ? cloud : local
}

export function mergeScriptureProgress(a: PlayerScripture, b: PlayerScripture): PlayerScripture {
  const [recent, older] = b.updatedAt > a.updatedAt ? [b, a] : [a, b]
  const recallDays = union(a.successfulRecallDays, b.successfulRecallDays).sort()
  const changeDays: PlayerScripture['masteryChangeDays'] = { ...older.masteryChangeDays }
  for (const [k, v] of Object.entries(recent.masteryChangeDays)) {
    const key = k as keyof typeof changeDays
    changeDays[key] = (changeDays[key] ?? '') > (v ?? '') ? changeDays[key] : v
  }
  return {
    ...recent,
    learningStartedAt: minDate(a.learningStartedAt, b.learningStartedAt)!,
    lastReviewedAt: maxDate(a.lastReviewedAt, b.lastReviewedAt),
    masteredAt: minDate(a.masteredAt, b.masteredAt),
    learnedAt: minDate(a.learnedAt, b.learnedAt),
    completedGameTypes: union(older.completedGameTypes, recent.completedGameTypes),
    successfulRecallDays: recallDays,
    masteryChangeDays: changeDays,
    totalAttempts: Math.max(a.totalAttempts, b.totalAttempts),
    successfulAttempts: Math.max(a.successfulAttempts, b.successfulAttempts),
    reviewsCompleted: Math.max(a.reviewsCompleted, b.reviewsCompleted),
    status: masteryStatus(recent.masteryScore, recallDays.length),
  }
}

/** Starting resources plus every transaction (spec §15: reconcile, never overwrite). */
export function balanceFromLedger(transactions: RewardTransaction[], updatedAt: string): PlayerResources {
  const total = transactions.reduce(
    (sum, t) => ({ coins: sum.coins + t.coinsDelta, seeds: sum.seeds + t.seedsDelta, gems: sum.gems + t.gemsDelta, xp: sum.xp + t.xpDelta }),
    { coins: STARTING_RESOURCES.coins, seeds: STARTING_RESOURCES.seeds, gems: STARTING_RESOURCES.gems, xp: STARTING_RESOURCES.xp },
  )
  return {
    coins: Math.max(0, total.coins),
    seeds: Math.max(0, total.seeds),
    gems: Math.max(0, total.gems),
    xp: Math.max(0, total.xp),
    level: levelForXp(total.xp),
    updatedAt,
  }
}

/**
 * Makes the garden agree with the ledger: land = land transactions; every item
 * owned (starting garden + purchases) is placed or in the inventory, and nothing
 * is kept that wasn't bought. Items on land that isn't unlocked go to the inventory.
 */
export function reconcileGarden(garden: GardenSnapshot, transactions: RewardTransaction[]): GardenSnapshot {
  const expansionsUnlocked = transactions.filter((t) => t.sourceType === 'land-expansion').length
  const rows = unlockedRowCount(expansionsUnlocked)
  const owned = new Map<string, number>()
  for (const s of STARTING_LAYOUT) owned.set(s.itemId, (owned.get(s.itemId) ?? 0) + 1)
  for (const t of transactions) if (t.sourceType === 'purchase') owned.set(t.sourceId, (owned.get(t.sourceId) ?? 0) + 1)

  const inventory: Inventory = { ...garden.inventory }
  let items = garden.items.filter((item) => {
    const def = getItem(item.itemId)
    if (!def) return false
    if (item.gridY + def.height > rows) {
      inventory[item.itemId] = (inventory[item.itemId] ?? 0) + 1
      return false
    }
    return true
  })

  for (const itemId of new Set([...owned.keys(), ...items.map((i) => i.itemId), ...Object.keys(inventory)])) {
    const placed = items.filter((i) => i.itemId === itemId)
    let have = placed.length + (inventory[itemId] ?? 0)
    const allowed = owned.get(itemId) ?? 0
    if (have > allowed) {
      const fromInventory = Math.min(inventory[itemId] ?? 0, have - allowed)
      inventory[itemId] = (inventory[itemId] ?? 0) - fromInventory
      have -= fromInventory
      if (have > allowed) {
        const remove = new Set(
          [...placed].sort((x, y) => y.placedAt.localeCompare(x.placedAt)).slice(0, have - allowed).map((i) => i.id),
        )
        items = items.filter((i) => !remove.has(i.id))
      }
    } else if (have < allowed) {
      inventory[itemId] = (inventory[itemId] ?? 0) + (allowed - have)
    }
    if (!inventory[itemId]) delete inventory[itemId]
  }
  return { items, inventory, meta: { ...garden.meta, expansionsUnlocked } }
}

export function mergeSnapshots(local: ProgressSnapshot, cloud: ProgressSnapshot): ProgressSnapshot {
  const transactions = mergeById(local.transactions, cloud.transactions, (t) => t.id)
  const claimed = new Set(transactions.filter((t) => t.sourceType === 'quest').map((t) => t.id.slice('quest:'.length)))

  const progressList = mergeById(Object.values(local.progress), Object.values(cloud.progress), (p) => p.scriptureId, mergeScriptureProgress)
  const quests = mergeById(local.quests, cloud.quests, (q) => q.id, (a, b) => ({
    ...a,
    progress: Math.max(a.progress, b.progress),
    target: Math.max(a.target, b.target),
    completedAt: minDate(a.completedAt, b.completedAt),
    rewardClaimed: a.rewardClaimed || b.rewardClaimed,
  })).map((q) => ({ ...q, rewardClaimed: claimed.has(q.id) }))
  const days = mergeById(Object.values(local.days), Object.values(cloud.days), (d) => d.date, (a, b) => ({
    date: a.date,
    studiedScriptureIds: union(a.studiedScriptureIds, b.studiedScriptureIds),
    goalCompletedAt: minDate(a.goalCompletedAt, b.goalCompletedAt),
  }))

  const gardenLatest =
    local.garden && cloud.garden
      ? (cloud.garden.meta.updatedAt ?? EPOCH) > (local.garden.meta.updatedAt ?? EPOCH)
        ? cloud.garden
        : local.garden
      : (local.garden ?? cloud.garden)

  const profile = latest(local.profile, cloud.profile)
  return {
    profile,
    settings: latest(local.settings, cloud.settings),
    progress: Object.fromEntries(progressList.map((p) => [p.scriptureId, p])),
    sessions: mergeById(local.sessions, cloud.sessions, (s) => s.id),
    transactions,
    garden: gardenLatest ? reconcileGarden(gardenLatest, transactions) : null,
    quests,
    days: Object.fromEntries(days.map((d) => [d.date, d])),
  }
}

/** Resources for a merged snapshot. */
export function resourcesFor(snapshot: ProgressSnapshot, now: Date = new Date()): PlayerResources {
  return balanceFromLedger(snapshot.transactions, now.toISOString())
}

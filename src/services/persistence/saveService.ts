/**
 * Save service: the only place the app reads/writes game data on the device.
 * Stores and screens call these functions instead of touching IndexedDB directly,
 * so cloud sync (Phase 8) can later hook in at one point.
 */
import type { PlayerProfile, PlayerResources, PlayerSettings } from '../../types/player'
import type { PlayerScripture } from '../../types/scripture'
import type { GameSession } from '../../types/games'
import type { RewardTransaction } from '../../types/rewards'
import type { GardenMeta, Inventory, PlacedGardenItem } from '../../types/garden'
import type { DailyQuest, DayRecord } from '../../types/quests'
import { clearAllStores, getAllRecords, getRecord, putRecord, putRecordsAtomically, type AtomicWrite } from './localDatabase'

/** Guest mode keeps exactly one player on the device, stored under this key. */
const PLAYER_KEY = 'current'

export interface SavedGame {
  profile: PlayerProfile
  resources: PlayerResources
  settings: PlayerSettings
}

export interface SavedGarden {
  items: PlacedGardenItem[]
  inventory: Inventory
  meta: GardenMeta
}

/** Loads the saved player, or `null` if this device has no player yet. */
export async function loadGame(): Promise<SavedGame | null> {
  const [profile, resources, settings] = await Promise.all([
    getRecord<PlayerProfile>('profile', PLAYER_KEY),
    getRecord<PlayerResources>('resources', PLAYER_KEY),
    getRecord<PlayerSettings>('settings', PLAYER_KEY),
  ])
  if (!profile || !resources || !settings) return null
  return { profile, resources, settings }
}

/** Saves a brand-new player and their starting garden in one atomic write. */
export async function saveNewGame(game: SavedGame, garden: SavedGarden): Promise<void> {
  await putRecordsAtomically([
    { store: 'profile', key: PLAYER_KEY, value: game.profile },
    { store: 'resources', key: PLAYER_KEY, value: game.resources },
    { store: 'settings', key: PLAYER_KEY, value: game.settings },
    ...gardenWrites(garden),
  ])
}

function gardenWrites(garden: SavedGarden): AtomicWrite[] {
  return [
    ...garden.items.map((i) => ({ store: 'gardenItems' as const, key: i.id, value: i })),
    ...Object.entries(garden.inventory).map(([itemId, quantity]) => ({
      store: 'inventory' as const,
      key: itemId,
      value: { itemId, quantity },
    })),
    { store: 'garden', key: PLAYER_KEY, value: garden.meta },
  ]
}

/** Loads the garden, or null if this player has none yet. */
export async function loadGarden(): Promise<SavedGarden | null> {
  const [meta, items, inventoryRows] = await Promise.all([
    getRecord<GardenMeta>('garden', PLAYER_KEY),
    getAllRecords<PlacedGardenItem>('gardenItems'),
    getAllRecords<{ itemId: string; quantity: number }>('inventory'),
  ])
  if (!meta) return null
  return { meta, items, inventory: Object.fromEntries(inventoryRows.map((r) => [r.itemId, r.quantity])) }
}

export function saveGarden(garden: SavedGarden): Promise<void> {
  return putRecordsAtomically(gardenWrites(garden))
}

/**
 * Saves one garden change atomically: placed items added/moved/removed,
 * inventory quantities, land, and (for purchases) the spending record and new balance.
 */
export function saveGardenChange(change: {
  putItems?: PlacedGardenItem[]
  deleteItemIds?: string[]
  /** item id → new quantity (0 removes it) */
  inventory?: Record<string, number>
  meta?: GardenMeta
  transactions?: RewardTransaction[]
  resources?: PlayerResources
}): Promise<void> {
  const writes: AtomicWrite[] = [
    ...(change.putItems ?? []).map((i) => ({ store: 'gardenItems' as const, key: i.id, value: i })),
    ...(change.deleteItemIds ?? []).map((id) => ({ store: 'gardenItems' as const, key: id, value: null, mode: 'delete' as const })),
    ...Object.entries(change.inventory ?? {}).map(([itemId, quantity]) =>
      quantity > 0
        ? { store: 'inventory' as const, key: itemId, value: { itemId, quantity } }
        : { store: 'inventory' as const, key: itemId, value: null, mode: 'delete' as const },
    ),
    ...(change.transactions ?? []).map((t) => ({ store: 'rewardTransactions' as const, key: t.id, value: t, mode: 'add' as const })),
  ]
  if (change.meta) writes.push({ store: 'garden', key: PLAYER_KEY, value: change.meta })
  if (change.resources) writes.push({ store: 'resources', key: PLAYER_KEY, value: change.resources })
  return putRecordsAtomically(writes)
}

export function saveProfile(profile: PlayerProfile): Promise<void> {
  return putRecord('profile', PLAYER_KEY, profile)
}

export function saveResources(resources: PlayerResources): Promise<void> {
  return putRecord('resources', PLAYER_KEY, resources)
}

export function saveSettings(settings: PlayerSettings): Promise<void> {
  return putRecord('settings', PLAYER_KEY, settings)
}

/** Loads the player's progress on every scripture they have started, keyed by scripture id. */
export async function loadScriptureProgress(): Promise<Record<string, PlayerScripture>> {
  const records = await getAllRecords<PlayerScripture>('scriptureProgress')
  return Object.fromEntries(records.map((r) => [r.scriptureId, r]))
}

export function saveScriptureProgress(progress: PlayerScripture): Promise<void> {
  return putRecord('scriptureProgress', progress.scriptureId, progress)
}

/**
 * Saves everything a finished game changes in ONE transaction (spec §11.7):
 * the session, the scripture progress, the new reward transactions and the new
 * resource balance. Reward transactions are added with "add", so if any of them
 * already exists the whole save is refused and no reward is granted twice.
 */
export function saveCompletedGame(input: {
  session: GameSession
  progress: PlayerScripture
  transactions: RewardTransaction[]
  resources: PlayerResources
  quests?: DailyQuest[]
  day?: DayRecord
}): Promise<void> {
  return putRecordsAtomically([
    { store: 'gameSessions', key: input.session.id, value: input.session, mode: 'add' },
    { store: 'scriptureProgress', key: input.progress.scriptureId, value: input.progress },
    ...input.transactions.map((t) => ({ store: 'rewardTransactions' as const, key: t.id, value: t, mode: 'add' as const })),
    { store: 'resources', key: PLAYER_KEY, value: input.resources },
    ...(input.quests ?? []).map((q) => ({ store: 'quests' as const, key: q.id, value: q })),
    ...(input.day ? [{ store: 'days' as const, key: input.day.date, value: input.day }] : []),
  ])
}

export function loadQuests(): Promise<DailyQuest[]> {
  return getAllRecords<DailyQuest>('quests')
}

export async function loadDays(): Promise<Record<string, DayRecord>> {
  const days = await getAllRecords<DayRecord>('days')
  return Object.fromEntries(days.map((d) => [d.date, d]))
}

export function saveQuests(quests: DailyQuest[]): Promise<void> {
  return putRecordsAtomically(quests.map((q) => ({ store: 'quests' as const, key: q.id, value: q })))
}

/** Claims a quest reward: the quest, its reward transaction (add-only) and the balance in one transaction. */
export function saveQuestClaim(quest: DailyQuest, transaction: RewardTransaction, resources: PlayerResources): Promise<void> {
  return putRecordsAtomically([
    { store: 'quests', key: quest.id, value: quest },
    { store: 'rewardTransactions', key: transaction.id, value: transaction, mode: 'add' },
    { store: 'resources', key: PLAYER_KEY, value: resources },
  ])
}

/** All finished games (for the progress dashboard). */
export function loadGameSessions(): Promise<GameSession[]> {
  return getAllRecords<GameSession>('gameSessions')
}

export function loadRewardTransactions(): Promise<RewardTransaction[]> {
  return getAllRecords<RewardTransaction>('rewardTransactions')
}

export function loadGameSession(id: string): Promise<GameSession | undefined> {
  return getRecord<GameSession>('gameSessions', id)
}

/** Deletes ALL saved progress on this device. */
export function resetAllProgress(): Promise<void> {
  return clearAllStores()
}

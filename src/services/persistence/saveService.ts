/**
 * Save service: the only place the app reads/writes game data on the device.
 * Stores and screens call these functions instead of touching IndexedDB directly,
 * so cloud sync (Phase 8) can later hook in at one point.
 */
import type { PlayerProfile, PlayerResources, PlayerSettings } from '../../types/player'
import type { PlayerScripture } from '../../types/scripture'
import type { GameSession } from '../../types/games'
import type { RewardTransaction } from '../../types/rewards'
import { clearAllStores, getAllRecords, getRecord, putRecord, putRecordsAtomically } from './localDatabase'

/** Guest mode keeps exactly one player on the device, stored under this key. */
const PLAYER_KEY = 'current'

export interface SavedGame {
  profile: PlayerProfile
  resources: PlayerResources
  settings: PlayerSettings
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

/** Saves a brand-new player in one atomic write. */
export async function saveNewGame(game: SavedGame): Promise<void> {
  await putRecordsAtomically([
    { store: 'profile', key: PLAYER_KEY, value: game.profile },
    { store: 'resources', key: PLAYER_KEY, value: game.resources },
    { store: 'settings', key: PLAYER_KEY, value: game.settings },
  ])
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
}): Promise<void> {
  return putRecordsAtomically([
    { store: 'gameSessions', key: input.session.id, value: input.session, mode: 'add' },
    { store: 'scriptureProgress', key: input.progress.scriptureId, value: input.progress },
    ...input.transactions.map((t) => ({ store: 'rewardTransactions' as const, key: t.id, value: t, mode: 'add' as const })),
    { store: 'resources', key: PLAYER_KEY, value: input.resources },
  ])
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

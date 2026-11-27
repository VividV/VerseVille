/**
 * Save service: the only place the app reads/writes game data on the device.
 * Stores and screens call these functions instead of touching IndexedDB directly,
 * so cloud sync (Phase 8) can later hook in at one point.
 */
import type { PlayerProfile, PlayerResources, PlayerSettings } from '../../types/player'
import { clearAllStores, getRecord, putRecord, putRecordsAtomically } from './localDatabase'

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

/** Deletes ALL saved progress on this device. */
export function resetAllProgress(): Promise<void> {
  return clearAllStores()
}

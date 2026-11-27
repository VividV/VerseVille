import { beforeEach, describe, expect, it } from 'vitest'
import { cleanDisplayName, useGameStore } from './gameStore'
import { DEFAULT_SETTINGS, useSettingsStore } from './settingsStore'
import { closeDatabase } from '../services/persistence/localDatabase'

function resetMemory() {
  useGameStore.setState({ status: 'loading', profile: null, resources: null, errorMessage: null })
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
}

describe('gameStore', () => {
  beforeEach(resetMemory)

  it('starts with no player on a fresh device', async () => {
    await useGameStore.getState().hydrate()
    expect(useGameStore.getState().status).toBe('ready')
    expect(useGameStore.getState().profile).toBeNull()
  })

  it('creates a guest player with the starting resources from the spec', async () => {
    await useGameStore.getState().createGuestPlayer({ displayName: '  Grace  ', preferredTranslation: 'KJV', dailyGoal: 5 })
    const { profile, resources } = useGameStore.getState()
    expect(profile?.displayName).toBe('Grace')
    expect(resources).toMatchObject({ coins: 100, seeds: 5, gems: 0, xp: 0, level: 1 })
    expect(useSettingsStore.getState().settings.dailyGoal).toBe(5)
  })

  it('rejects an empty display name', async () => {
    await expect(
      useGameStore.getState().createGuestPlayer({ displayName: '   ', preferredTranslation: 'KJV', dailyGoal: 3 }),
    ).rejects.toThrow()
    expect(useGameStore.getState().profile).toBeNull()
  })

  it('restores the player and settings after a refresh / browser restart', async () => {
    await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 1 })
    await useSettingsStore.getState().updateSettings({ textSize: 'large', soundEnabled: false })
    await useGameStore.getState().updateDisplayName('Grace A.')

    // Simulate closing the browser: forget everything in memory and close the DB.
    resetMemory()
    await closeDatabase()

    await useGameStore.getState().hydrate()
    expect(useGameStore.getState().profile?.displayName).toBe('Grace A.')
    expect(useGameStore.getState().resources?.coins).toBe(100)
    expect(useSettingsStore.getState().settings).toMatchObject({ dailyGoal: 1, textSize: 'large', soundEnabled: false })
  })

  it('reset progress erases everything on the device', async () => {
    await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 3 })
    await useGameStore.getState().resetProgress()
    resetMemory()
    await useGameStore.getState().hydrate()
    expect(useGameStore.getState().profile).toBeNull()
  })
})

describe('cleanDisplayName', () => {
  it('trims, collapses spaces and limits length', () => {
    expect(cleanDisplayName('  a   b ')).toBe('a b')
    expect(cleanDisplayName('x'.repeat(40))).toHaveLength(24)
  })
})

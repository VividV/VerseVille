import { describe, expect, it } from 'vitest'
import { useGameStore } from './gameStore'
import { useGardenStore } from './gardenStore'
import { DEFAULT_SETTINGS, useSettingsStore } from './settingsStore'
import { DB_NAME, closeDatabase, getAllRecords } from '../services/persistence/localDatabase'

function forgetMemory() {
  useGameStore.setState({ status: 'loading', profile: null, resources: null, scriptureProgress: {}, rewardTransactions: [], lastGame: null })
  useGardenStore.setState({ items: [], inventory: {}, expansionsUnlocked: 0 })
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
}

async function newPlayer() {
  forgetMemory()
  await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 3 })
}

describe('garden store', () => {
  it('a new player gets the starting garden', async () => {
    await newPlayer()
    expect(useGardenStore.getState().items).toHaveLength(6)
  })

  it('buys, places, moves and puts away items; all of it survives a restart', async () => {
    await newPlayer()
    const garden = useGardenStore.getState()
    await garden.buyItem('flower_bed') // 20 coins, 1 seed
    await useGardenStore.getState().buyItem('bench') // 30 coins
    expect(useGameStore.getState().resources).toMatchObject({ coins: 50, seeds: 4 })
    expect(useGardenStore.getState().inventory).toEqual({ flower_bed: 1, bench: 1 })

    const placed = await useGardenStore.getState().placeItem('bench', 0, 6)
    expect(useGardenStore.getState().inventory).toEqual({ flower_bed: 1 })
    await useGardenStore.getState().moveItem(placed.id, 1, 6)
    await useGardenStore.getState().putAway('start-bed-1')
    expect(useGardenStore.getState().inventory).toEqual({ flower_bed: 2 })

    forgetMemory()
    await closeDatabase()
    await useGameStore.getState().hydrate()
    const after = useGardenStore.getState()
    expect(after.inventory).toEqual({ flower_bed: 2 })
    expect(after.items.find((i) => i.id === placed.id)).toMatchObject({ gridX: 1, gridY: 6 })
    expect(after.items.some((i) => i.id === 'start-bed-1')).toBe(false)
    expect(useGameStore.getState().resources).toMatchObject({ coins: 50, seeds: 4 })
    expect(useGameStore.getState().rewardTransactions.filter((t) => t.sourceType === 'purchase')).toHaveLength(2)
  })

  it('refuses purchases the player cannot afford and never goes negative', async () => {
    await newPlayer()
    for (let i = 0; i < 3; i++) await useGardenStore.getState().buyItem('bench') // 90 coins
    await expect(useGardenStore.getState().buyItem('bench')).rejects.toThrow(/enough/)
    expect(useGameStore.getState().resources!.coins).toBe(10)
  })

  it('refuses invalid placements and placing items you do not own', async () => {
    await newPlayer()
    await expect(useGardenStore.getState().placeItem('bench', 0, 6)).rejects.toThrow(/buy/)
    await useGardenStore.getState().buyItem('bench')
    await expect(useGardenStore.getState().placeItem('bench', 1, 1)).rejects.toThrow(/already there/)
    await expect(useGardenStore.getState().placeItem('bench', 0, 8)).rejects.toThrow(/locked/)
    expect(useGardenStore.getState().inventory).toEqual({ bench: 1 })
  })

  it('cannot put away the cottage or the scripture tree', async () => {
    await newPlayer()
    await expect(useGardenStore.getState().putAway('start-tree')).rejects.toThrow()
    await expect(useGardenStore.getState().putAway('start-cottage')).rejects.toThrow()
  })

  it('unlocks land only when the requirements are met', async () => {
    await newPlayer()
    await expect(useGardenStore.getState().unlockExpansion()).rejects.toThrow(/requirements/)
    // Pretend the player is level 3 with 10 mastered scriptures.
    const progress = Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`s${i}`, { masteredAt: '2026-11-01T00:00:00' }]),
    ) as never
    useGameStore.setState({ resources: { ...useGameStore.getState().resources!, level: 3, xp: 400 }, scriptureProgress: progress })
    await useGardenStore.getState().unlockExpansion()
    expect(useGardenStore.getState().expansionsUnlocked).toBe(1)
    expect(useGameStore.getState().resources!.coins).toBe(0)
    await useGardenStore.getState().buyItem('stone_path').catch(() => undefined) // no coins left
    expect(useGameStore.getState().resources!.coins).toBe(0)
  })

  it('upgrades a database from before the garden existed and adds the starting garden', async () => {
    forgetMemory()
    await closeDatabase()
    // Build a version-1 database with only a player in it.
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        for (const s of ['profile', 'resources', 'settings', 'scriptureProgress', 'gardenItems', 'inventory', 'quests', 'gameSessions', 'rewardTransactions'])
          req.result.createObjectStore(s)
      }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction(['profile', 'resources', 'settings'], 'readwrite')
        const now = '2026-11-01T00:00:00.000Z'
        tx.objectStore('profile').put({ id: 'p', displayName: 'Old', createdAt: now, updatedAt: now }, 'current')
        tx.objectStore('resources').put({ coins: 42, seeds: 1, gems: 0, xp: 0, level: 1, updatedAt: now }, 'current')
        tx.objectStore('settings').put(DEFAULT_SETTINGS, 'current')
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    })

    await useGameStore.getState().hydrate()
    expect(useGameStore.getState().profile?.displayName).toBe('Old')
    expect(useGameStore.getState().resources?.coins).toBe(42)
    expect(useGardenStore.getState().items).toHaveLength(6)
    expect(await getAllRecords('gardenItems')).toHaveLength(6)
  })
})

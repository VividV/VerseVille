import { describe, expect, it } from 'vitest'
import { getAllItems, getItem, getShopItems, itemsUnlockedAtLevel } from './catalog'
import { BASE_ROWS, GRID_COLUMNS, TOTAL_ROWS, occupiedTiles, unlockedRowCount, validatePlacement } from './gardenGrid'
import { addToInventory, checkPurchase, ownedCount, purchaseTransaction } from './shop'
import { createStartingGarden } from './startingGarden'
import { checkExpansion, nextExpansion } from '../progression/gardenUnlocks'
import { hasVillageArt } from '../../components/village/villageArt'

const start = createStartingGarden(new Date('2026-11-27T10:00:00'))
const garden = { items: start, expansionsUnlocked: 0 }
const bench = getItem('bench')!
const barn = getItem('barn')!
const money = { coins: 100, seeds: 5, gems: 0, xp: 0 }

describe('catalogue', () => {
  it('has a drawing, a positive size and a known category for every item', () => {
    for (const item of getAllItems()) {
      expect(hasVillageArt(item.id), item.id).toBe(true)
      expect(item.width).toBeGreaterThan(0)
      expect(item.height).toBeGreaterThan(0)
      expect(['building', 'decoration', 'plant', 'path']).toContain(item.category)
    }
  })
  it('never sells the Scripture Tree', () => {
    expect(getShopItems('building').some((i) => i.id === 'scripture_tree')).toBe(false)
  })
  it('lists items that unlock at a level', () => {
    expect(itemsUnlockedAtLevel(2).map((i) => i.id)).toContain('barn')
  })
})

describe('starting garden (spec §13.2)', () => {
  it('has a cottage, scripture tree, three flower beds and a path, with no overlaps', () => {
    const ids = start.map((i) => i.itemId)
    expect(ids.filter((i) => i === 'small_cottage')).toHaveLength(1)
    expect(ids.filter((i) => i === 'scripture_tree')).toHaveLength(1)
    expect(ids.filter((i) => i === 'flower_bed')).toHaveLength(3)
    expect(ids.filter((i) => i === 'stone_path')).toHaveLength(1)
    for (const item of start) {
      const others = { items: start, expansionsUnlocked: 0 }
      expect(validatePlacement(others, getItem(item.itemId)!, item.gridX, item.gridY, item.id)).toEqual({ ok: true })
    }
  })
})

describe('placement (spec §13.4, §20)', () => {
  it('starts with an 8 × 8 grid', () => {
    expect(GRID_COLUMNS).toBe(8)
    expect(unlockedRowCount(0)).toBe(BASE_ROWS)
    expect(BASE_ROWS).toBe(8)
  })

  it('accepts a valid placement', () => {
    expect(validatePlacement(garden, bench, 0, 6)).toEqual({ ok: true })
    expect(validatePlacement(garden, barn, 0, 6)).toEqual({ ok: true })
  })

  it('rejects placement outside the garden', () => {
    expect(validatePlacement(garden, bench, -1, 0)).toEqual({ ok: false, reason: 'outside' })
    expect(validatePlacement(garden, barn, 7, 0)).toEqual({ ok: false, reason: 'outside' })
    expect(validatePlacement(garden, bench, 0, TOTAL_ROWS)).toEqual({ ok: false, reason: 'outside' })
  })

  it('rejects overlapping buildings, even partly', () => {
    expect(validatePlacement(garden, bench, 1, 1)).toEqual({ ok: false, reason: 'overlap' }) // on the tree
    expect(validatePlacement(garden, barn, 4, 0)).toEqual({ ok: false, reason: 'overlap' }) // corner of the cottage
  })

  it('lets a moving item overlap its own old spot', () => {
    const tree = start.find((i) => i.itemId === 'scripture_tree')!
    expect(validatePlacement(garden, getItem('scripture_tree')!, 1, 2, tree.id)).toEqual({ ok: true })
  })

  it('rejects locked land until it is unlocked', () => {
    expect(validatePlacement(garden, bench, 0, 8)).toEqual({ ok: false, reason: 'locked' })
    expect(validatePlacement(garden, barn, 0, 7)).toEqual({ ok: false, reason: 'locked' }) // half on locked land
    expect(validatePlacement({ ...garden, expansionsUnlocked: 1 }, bench, 0, 8)).toEqual({ ok: true })
  })

  it('rejects blocked tiles (the pond)', () => {
    expect(validatePlacement(garden, bench, 6, 6)).toEqual({ ok: false, reason: 'blocked' })
    expect(validatePlacement(garden, barn, 5, 5)).toEqual({ ok: false, reason: 'blocked' })
  })

  it('tracks every tile an item covers', () => {
    const occ = occupiedTiles(start)
    expect(occ.get('1,1')).toBe('start-tree')
    expect(occ.get('2,2')).toBe('start-tree')
    expect(occ.has('3,3')).toBe(false)
  })
})

describe('shop (spec Screen 12, §20)', () => {
  it('allows an affordable, unlocked purchase', () => {
    expect(checkPurchase({ item: bench, level: 1, resources: money, owned: 0 })).toEqual({ ok: true })
  })
  it('refuses when the player cannot afford it', () => {
    expect(checkPurchase({ item: getItem('fountain')!, level: 5, resources: money, owned: 0 })).toEqual({ ok: false, reason: 'cannot-afford' })
    expect(checkPurchase({ item: getItem('olive_tree')!, level: 5, resources: { ...money, coins: 999, seeds: 1 }, owned: 0 })).toEqual({
      ok: false,
      reason: 'cannot-afford',
    })
  })
  it('refuses items above the player level', () => {
    expect(checkPurchase({ item: barn, level: 1, resources: { ...money, coins: 999 }, owned: 0 })).toEqual({ ok: false, reason: 'level' })
  })
  it('prevents buying a unique building twice, but allows repeatable decorations', () => {
    expect(checkPurchase({ item: barn, level: 2, resources: { ...money, coins: 999 }, owned: 1 })).toEqual({ ok: false, reason: 'owned' })
    expect(checkPurchase({ item: bench, level: 1, resources: money, owned: 7 })).toEqual({ ok: true })
  })
  it('records spending as negative amounts', () => {
    expect(purchaseTransaction(getItem('flower_bed')!, 'abc', new Date())).toMatchObject({ id: 'purchase:abc', coinsDelta: -20, seedsDelta: -1 })
  })
  it('updates inventory quantities and never goes below zero', () => {
    let inv = addToInventory({}, 'bench')
    inv = addToInventory(inv, 'bench')
    expect(inv).toEqual({ bench: 2 })
    inv = addToInventory(inv, 'bench', -2)
    expect(inv).toEqual({})
    expect(() => addToInventory(inv, 'bench', -1)).toThrow()
  })
  it('counts owned items in inventory and in the garden', () => {
    expect(ownedCount('flower_bed', { flower_bed: 2 }, start)).toBe(5)
  })
})

describe('land expansion (spec §13.5)', () => {
  it('unlocks in order with level, mastered scriptures and coins', () => {
    const first = nextExpansion(0)!
    expect(first).toMatchObject({ requiredLevel: 3, requiredMastered: 10, coinCost: 100 })
    expect(checkExpansion(first, { level: 3, masteredCount: 10, coins: 100 }).canUnlock).toBe(true)
    const short = checkExpansion(first, { level: 3, masteredCount: 9, coins: 500 })
    expect(short.canUnlock).toBe(false)
    expect(short.requirements.filter((r) => !r.met).map((r) => r.label)).toEqual(['Master 10 scriptures'])
    expect(nextExpansion(1)).toMatchObject({ requiredLevel: 5, requiredMastered: 25, coinCost: 250 })
    expect(nextExpansion(3)).toBeNull()
  })
})

/**
 * Garden state: placed items, unplaced inventory and unlocked land.
 * All rules come from src/engine/garden; this store only applies them and saves.
 * Coins and seeds live in gameStore, so purchases update both together.
 */
import { create } from 'zustand'
import type { GardenItemDefinition, Inventory, PlacedGardenItem } from '../types/garden'
import { getItem } from '../engine/garden/catalog'
import { PLACEMENT_MESSAGES, validatePlacement } from '../engine/garden/gardenGrid'
import { addToInventory, checkPurchase, ownedCount, purchaseTransaction, type PurchaseProblem } from '../engine/garden/shop'
import { PERMANENT_ITEMS } from '../engine/garden/startingGarden'
import { checkExpansion, expansionTransaction, nextExpansion } from '../engine/progression/gardenUnlocks'
import { applyTransactions } from '../engine/rewards/economy'
import { saveGardenChange } from '../services/persistence/saveService'
import { createId } from '../utils/idUtils'
import { useGameStore } from './gameStore'
import { track } from '../services/analytics/analytics'
import { exclusive } from '../services/sync/lock'

export const PURCHASE_MESSAGES: Record<PurchaseProblem, string> = {
  'not-for-sale': "This item can't be bought.",
  level: 'Reach a higher level to unlock this.',
  owned: 'You already own this building.',
  'cannot-afford': "You don't have enough coins or seeds yet.",
}

interface GardenState {
  items: PlacedGardenItem[]
  inventory: Inventory
  expansionsUnlocked: number
  /** When the garden layout last changed (for merging devices). */
  updatedAt: string

  buyItem: (itemId: string) => Promise<void>
  placeItem: (itemId: string, x: number, y: number) => Promise<PlacedGardenItem>
  moveItem: (placedId: string, x: number, y: number) => Promise<void>
  putAway: (placedId: string) => Promise<void>
  unlockExpansion: () => Promise<void>
}

function requireItem(itemId: string): GardenItemDefinition {
  const def = getItem(itemId)
  if (!def) throw new Error('Unknown item.')
  return def
}

function masteredCount(): number {
  return Object.values(useGameStore.getState().scriptureProgress).filter((p) => p.masteredAt !== null).length
}

export const useGardenStore = create<GardenState>()((set, get) => ({
  items: [],
  inventory: {},
  expansionsUnlocked: 0,
  updatedAt: '1970-01-01T00:00:00.000Z',

  buyItem: (itemId) => exclusive(async () => {
    const def = requireItem(itemId)
    const { resources, rewardTransactions } = useGameStore.getState()
    if (!resources) throw new Error('No player profile.')
    const check = checkPurchase({
      item: def,
      level: resources.level,
      resources,
      owned: ownedCount(itemId, get().inventory, get().items),
    })
    if (!check.ok) throw new Error(PURCHASE_MESSAGES[check.reason])

    const now = new Date()
    const transaction = purchaseTransaction(def, createId(), now)
    const newResources = applyTransactions(resources, [transaction], now) // throws if it would go negative
    const inventory = addToInventory(get().inventory, itemId)
    const meta = stamp(get().expansionsUnlocked)
    await saveGardenChange({
      meta,
      inventory: { [itemId]: inventory[itemId] },
      transactions: [transaction],
      resources: newResources,
    })
    useGameStore.setState({ resources: newResources, rewardTransactions: [...rewardTransactions, transaction] })
    set({ inventory, updatedAt: meta.updatedAt })
    void track('garden_item_purchased', { itemId })
  }),

  placeItem: (itemId, x, y) => exclusive(async () => {
    const def = requireItem(itemId)
    if ((get().inventory[itemId] ?? 0) < 1) throw new Error('You need to buy this item first.')
    const check = validatePlacement(get(), def, x, y)
    if (!check.ok) throw new Error(PLACEMENT_MESSAGES[check.reason])
    const placed: PlacedGardenItem = {
      id: createId(),
      itemId,
      gridX: x,
      gridY: y,
      rotation: 0,
      placedAt: new Date().toISOString(),
    }
    const inventory = addToInventory(get().inventory, itemId, -1)
    const meta = stamp(get().expansionsUnlocked)
    await saveGardenChange({ meta, putItems: [placed], inventory: { [itemId]: inventory[itemId] ?? 0 } })
    set({ items: [...get().items, placed], inventory, updatedAt: meta.updatedAt })
    void track('garden_item_placed', { itemId })
    return placed
  }),

  moveItem: (placedId, x, y) => exclusive(async () => {
    const item = get().items.find((i) => i.id === placedId)
    if (!item) throw new Error('Item not found.')
    const check = validatePlacement(get(), requireItem(item.itemId), x, y, placedId)
    if (!check.ok) throw new Error(PLACEMENT_MESSAGES[check.reason])
    const moved = { ...item, gridX: x, gridY: y }
    const meta = stamp(get().expansionsUnlocked)
    await saveGardenChange({ meta, putItems: [moved] })
    set({ items: get().items.map((i) => (i.id === placedId ? moved : i)), updatedAt: meta.updatedAt })
  }),

  putAway: (placedId) => exclusive(async () => {
    const item = get().items.find((i) => i.id === placedId)
    if (!item) throw new Error('Item not found.')
    if (PERMANENT_ITEMS.has(item.itemId)) throw new Error('This stays in your garden.')
    const inventory = addToInventory(get().inventory, item.itemId)
    const meta = stamp(get().expansionsUnlocked)
    await saveGardenChange({ meta, deleteItemIds: [placedId], inventory: { [item.itemId]: inventory[item.itemId] } })
    set({ items: get().items.filter((i) => i.id !== placedId), inventory, updatedAt: meta.updatedAt })
  }),

  unlockExpansion: () => exclusive(async () => {
    const expansion = nextExpansion(get().expansionsUnlocked)
    if (!expansion) throw new Error('All land is already unlocked.')
    const { resources, rewardTransactions } = useGameStore.getState()
    if (!resources) throw new Error('No player profile.')
    const check = checkExpansion(expansion, { level: resources.level, masteredCount: masteredCount(), coins: resources.coins })
    if (!check.canUnlock) throw new Error("You haven't met all the requirements yet.")
    const now = new Date()
    const transaction = expansionTransaction(expansion, now)
    const newResources = applyTransactions(resources, [transaction], now)
    const expansionsUnlocked = get().expansionsUnlocked + 1
    const meta = stamp(expansionsUnlocked)
    await saveGardenChange({ meta, transactions: [transaction], resources: newResources })
    useGameStore.setState({ resources: newResources, rewardTransactions: [...rewardTransactions, transaction] })
    set({ expansionsUnlocked, updatedAt: meta.updatedAt })
  }),
}))

function stamp(expansionsUnlocked: number) {
  return { expansionsUnlocked, updatedAt: new Date().toISOString() }
}

/** Number of scriptures ever mastered (used for land requirements). */
export { masteredCount }

/**
 * Garden shop rules (spec Screen 12). Pure functions.
 * Never allows negative currency, checks affordability first, and prevents
 * buying a unique building twice.
 */
import type { GardenItemDefinition, Inventory, PlacedGardenItem } from '../../types/garden'
import type { ResourceAmounts, RewardTransaction } from '../../types/rewards'
import { canAfford } from '../rewards/economy'

export type PurchaseProblem = 'not-for-sale' | 'level' | 'owned' | 'cannot-afford'

export type PurchaseCheck = { ok: true } | { ok: false; reason: PurchaseProblem }

/** How many of an item the player owns: in the inventory plus placed in the garden. */
export function ownedCount(itemId: string, inventory: Inventory, placed: PlacedGardenItem[]): number {
  return (inventory[itemId] ?? 0) + placed.filter((p) => p.itemId === itemId).length
}

export function checkPurchase(input: {
  item: GardenItemDefinition
  level: number
  resources: ResourceAmounts
  owned: number
}): PurchaseCheck {
  const { item } = input
  if (item.notForSale) return { ok: false, reason: 'not-for-sale' }
  if (input.level < item.unlockLevel) return { ok: false, reason: 'level' }
  if (item.isUnique && input.owned > 0) return { ok: false, reason: 'owned' }
  if (!canAfford(input.resources, { coins: item.coinCost, seeds: item.seedCost })) return { ok: false, reason: 'cannot-afford' }
  return { ok: true }
}

/** The spending record for a purchase (negative amounts). */
export function purchaseTransaction(item: GardenItemDefinition, id: string, now: Date): RewardTransaction {
  return {
    id: `purchase:${id}`,
    sourceType: 'purchase',
    sourceId: item.id,
    sessionId: null,
    coinsDelta: -item.coinCost,
    seedsDelta: -item.seedCost,
    gemsDelta: 0,
    xpDelta: 0,
    label: `Bought ${item.name}`,
    createdAt: now.toISOString(),
  }
}

export function addToInventory(inventory: Inventory, itemId: string, amount = 1): Inventory {
  const quantity = (inventory[itemId] ?? 0) + amount
  if (quantity < 0) throw new Error('Not in inventory.')
  const next = { ...inventory }
  if (quantity === 0) delete next[itemId]
  else next[itemId] = quantity
  return next
}

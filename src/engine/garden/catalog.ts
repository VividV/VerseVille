/** The garden item catalogue (buildings.json + decorations.json). */
import buildingsJson from '../../data/buildings.json'
import decorationsJson from '../../data/decorations.json'
import type { GardenItemDefinition, ItemCategory } from '../../types/garden'

const ALL_ITEMS = [...buildingsJson, ...decorationsJson] as GardenItemDefinition[]
const BY_ID = new Map(ALL_ITEMS.map((i) => [i.id, i]))

export const SHOP_CATEGORIES: { id: ItemCategory; label: string }[] = [
  { id: 'building', label: 'Buildings' },
  { id: 'decoration', label: 'Decorations' },
  { id: 'plant', label: 'Plants' },
  { id: 'path', label: 'Paths' },
]

export function getAllItems(): GardenItemDefinition[] {
  return ALL_ITEMS
}

export function getItem(id: string): GardenItemDefinition | undefined {
  return BY_ID.get(id)
}

/** Items shown in the shop for a category, cheapest unlock level first. */
export function getShopItems(category: ItemCategory): GardenItemDefinition[] {
  return ALL_ITEMS.filter((i) => i.category === category && !i.notForSale).sort(
    (a, b) => a.unlockLevel - b.unlockLevel || a.coinCost - b.coinCost,
  )
}

/** Items that become available exactly at this level (shown when levelling up). */
export function itemsUnlockedAtLevel(level: number): GardenItemDefinition[] {
  return ALL_ITEMS.filter((i) => !i.notForSale && i.unlockLevel === level)
}

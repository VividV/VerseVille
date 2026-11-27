export type ItemCategory = 'building' | 'decoration' | 'plant' | 'path'

/** A catalogue item (src/data/buildings.json, decorations.json; spec §13.3). */
export interface GardenItemDefinition {
  id: string
  name: string
  category: ItemCategory
  description: string
  coinCost: number
  seedCost: number
  unlockLevel: number
  width: number
  height: number
  /** Unique buildings can be owned only once. */
  isUnique: boolean
  /** Name of the item's drawing (the village art is chosen by item id in components/village/villageArt.tsx). */
  art: string
  /** Starting items that can't be bought (e.g. the Scripture Tree). */
  notForSale?: boolean
}

/** An item placed in the garden (spec §8 garden_items). */
export interface PlacedGardenItem {
  id: string
  itemId: string
  gridX: number
  gridY: number
  rotation: number
  placedAt: string
}

/** Land expansions (src/data/expansions.json, spec §13.5). */
export interface GardenExpansion {
  id: number
  name: string
  rows: number
  requiredLevel: number
  requiredMastered: number
  coinCost: number
}

/** Saved garden state besides the items: how much land is unlocked. */
export interface GardenMeta {
  expansionsUnlocked: number
  /** When the garden last changed (used to merge devices). Missing on old saves. */
  updatedAt?: string
}

/** Unplaced items the player owns: item id → quantity (spec §8 inventory). */
export type Inventory = Record<string, number>

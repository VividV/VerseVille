/** The garden every new player starts with (spec §13.2). */
import type { PlacedGardenItem } from '../../types/garden'

export const STARTING_LAYOUT: { key: string; itemId: string; gridX: number; gridY: number }[] = [
  { key: 'tree', itemId: 'scripture_tree', gridX: 1, gridY: 1 },
  { key: 'cottage', itemId: 'small_cottage', gridX: 5, gridY: 1 },
  { key: 'path', itemId: 'stone_path', gridX: 5, gridY: 3 },
  { key: 'bed-1', itemId: 'flower_bed', gridX: 1, gridY: 4 },
  { key: 'bed-2', itemId: 'flower_bed', gridX: 2, gridY: 4 },
  { key: 'bed-3', itemId: 'flower_bed', gridX: 3, gridY: 4 },
]

/** Items that are always in the garden: they can be moved but not put away. */
export const PERMANENT_ITEMS = new Set(['scripture_tree', 'small_cottage'])

export function createStartingGarden(now: Date): PlacedGardenItem[] {
  return STARTING_LAYOUT.map((s) => ({
    id: `start-${s.key}`,
    itemId: s.itemId,
    gridX: s.gridX,
    gridY: s.gridY,
    rotation: 0,
    placedAt: now.toISOString(),
  }))
}

/**
 * The garden grid (spec §13.4). Pure rules — no React, no saving.
 *
 * The garden is 8 tiles wide. The first 8 rows are unlocked from the start
 * (8 × 8); each land expansion adds rows below. x is the column (0–7),
 * y is the row (0 at the top).
 */
import expansionsJson from '../../data/expansions.json'
import type { GardenExpansion, GardenItemDefinition, PlacedGardenItem } from '../../types/garden'
import { getItem } from './catalog'

export const GRID_COLUMNS = 8
export const BASE_ROWS = 8
export const EXPANSIONS = expansionsJson as GardenExpansion[]
export const TOTAL_ROWS = BASE_ROWS + EXPANSIONS.reduce((sum, e) => sum + e.rows, 0)

export type TerrainKind = 'pond'

/** Tiles where nothing can be built. */
export const BLOCKED_TILES: { x: number; y: number; kind: TerrainKind }[] = [
  { x: 6, y: 6, kind: 'pond' },
  { x: 7, y: 6, kind: 'pond' },
  { x: 6, y: 7, kind: 'pond' },
  { x: 7, y: 7, kind: 'pond' },
]

/** How many rows are unlocked after `expansionsUnlocked` expansions. */
export function unlockedRowCount(expansionsUnlocked: number): number {
  return BASE_ROWS + EXPANSIONS.slice(0, expansionsUnlocked).reduce((sum, e) => sum + e.rows, 0)
}

/** First row and row count of an expansion (1-based expansion number). */
export function expansionRows(expansionNumber: number): { firstRow: number; rows: number } {
  return { firstRow: unlockedRowCount(expansionNumber - 1), rows: EXPANSIONS[expansionNumber - 1].rows }
}

export function isBlocked(x: number, y: number): boolean {
  return BLOCKED_TILES.some((t) => t.x === x && t.y === y)
}

/** Every tile an item covers. */
export function footprint(def: Pick<GardenItemDefinition, 'width' | 'height'>, x: number, y: number) {
  const tiles: { x: number; y: number }[] = []
  for (let dy = 0; dy < def.height; dy++) for (let dx = 0; dx < def.width; dx++) tiles.push({ x: x + dx, y: y + dy })
  return tiles
}

/** Map of "x,y" → placed item id, for every occupied tile. */
export function occupiedTiles(items: PlacedGardenItem[], ignoreItemId?: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const item of items) {
    if (item.id === ignoreItemId) continue
    const def = getItem(item.itemId)
    if (!def) continue
    for (const t of footprint(def, item.gridX, item.gridY)) map.set(`${t.x},${t.y}`, item.id)
  }
  return map
}

export type PlacementProblem = 'outside' | 'locked' | 'blocked' | 'overlap'

export type PlacementCheck = { ok: true } | { ok: false; reason: PlacementProblem }

export const PLACEMENT_MESSAGES: Record<PlacementProblem, string> = {
  outside: "That doesn't fit inside the garden.",
  locked: 'That land is still locked.',
  blocked: "You can't build on the pond.",
  overlap: 'Something is already there.',
}

/**
 * Can this item go with its top-left corner at (x, y)?
 * `ignoreItemId` lets an item being moved overlap its own old spot.
 */
export function validatePlacement(
  garden: { items: PlacedGardenItem[]; expansionsUnlocked: number },
  def: Pick<GardenItemDefinition, 'width' | 'height'>,
  x: number,
  y: number,
  ignoreItemId?: string,
): PlacementCheck {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return { ok: false, reason: 'outside' }
  if (x < 0 || y < 0 || x + def.width > GRID_COLUMNS || y + def.height > TOTAL_ROWS) return { ok: false, reason: 'outside' }
  const tiles = footprint(def, x, y)
  const unlockedRows = unlockedRowCount(garden.expansionsUnlocked)
  if (tiles.some((t) => t.y >= unlockedRows)) return { ok: false, reason: 'locked' }
  if (tiles.some((t) => isBlocked(t.x, t.y))) return { ok: false, reason: 'blocked' }
  const occupied = occupiedTiles(garden.items, ignoreItemId)
  if (tiles.some((t) => occupied.has(`${t.x},${t.y}`))) return { ok: false, reason: 'overlap' }
  return { ok: true }
}

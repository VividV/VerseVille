import type { GardenItemDefinition, PlacedGardenItem } from '../../types/garden'
import { getItem } from '../../engine/garden/catalog'
import { BLOCKED_TILES, GRID_COLUMNS, expansionRows, unlockedRowCount, validatePlacement } from '../../engine/garden/gardenGrid'
import { nextExpansion } from '../../engine/progression/gardenUnlocks'
import { ItemArt } from './itemArt'

export type CanvasMode =
  | { kind: 'view' }
  | { kind: 'place'; def: GardenItemDefinition; movingId?: string; target: { x: number; y: number } | null }

export interface GardenCanvasProps {
  items: PlacedGardenItem[]
  expansionsUnlocked: number
  mode: CanvasMode
  /** Id of an item that was just placed, to animate it. */
  justPlacedId?: string | null
  onTileTap: (x: number, y: number) => void
  onItemTap: (item: PlacedGardenItem) => void
  onLockedTap: () => void
}

const cell = (x: number, y: number, w = 1, h = 1) => ({
  gridColumn: `${x + 1} / span ${w}`,
  gridRow: `${y + 1} / span ${h}`,
})

/**
 * The interactive garden (spec Screen 3, §13.4): a grid of grass tiles with
 * buildings and decorations on top. Tiles and items share one CSS grid, so
 * items always line up with tiles at any screen size.
 */
export function GardenCanvas({ items, expansionsUnlocked, mode, justPlacedId, onTileTap, onItemTap, onLockedTap }: GardenCanvasProps) {
  const unlockedRows = unlockedRowCount(expansionsUnlocked)
  const upcoming = nextExpansion(expansionsUnlocked)
  const lockedRows = upcoming ? expansionRows(upcoming.id).rows : 0
  const totalRows = unlockedRows + lockedRows
  const placing = mode.kind === 'place'
  const preview =
    mode.kind === 'place' && mode.target
      ? {
          ...mode.target,
          def: mode.def,
          check: validatePlacement({ items, expansionsUnlocked }, mode.def, mode.target.x, mode.target.y, mode.movingId),
        }
      : null

  const tiles = []
  for (let y = 0; y < unlockedRows; y++) {
    for (let x = 0; x < GRID_COLUMNS; x++) {
      const shade = (x + y) % 2 === 0 ? 'bg-[#8FC184]' : 'bg-[#86BA7B]'
      tiles.push(
        placing ? (
          <button
            key={`${x},${y}`}
            type="button"
            style={cell(x, y)}
            className={`aspect-square ${shade} outline-1 -outline-offset-1 outline-white/25 hover:brightness-110 focus-visible:z-20`}
            aria-label={`Place at row ${y + 1}, column ${x + 1}`}
            onClick={() => onTileTap(x, y)}
          />
        ) : (
          <div key={`${x},${y}`} style={cell(x, y)} className={`aspect-square ${shade}`} />
        ),
      )
    }
  }

  return (
    <div
      className="relative grid w-full overflow-hidden rounded-card bg-[#86BA7B] shadow-soft"
      style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${totalRows}, auto)` }}
      role="group"
      aria-label="Your garden"
    >
      {tiles}

      {/* Pond (blocked tiles) */}
      {BLOCKED_TILES.filter((t) => t.y < unlockedRows).length > 0 && (
        <div style={cell(6, 6, 2, 2)} className="pointer-events-none z-0 p-[6%]" aria-hidden="true">
          <div className="h-full w-full rounded-[40%] bg-[#7EC4DB] shadow-[inset_0_4px_0_rgba(255,255,255,0.4)]">
            <div className="ml-[20%] mt-[25%] h-[12%] w-[30%] rounded-full bg-white/50" />
          </div>
        </div>
      )}

      {items.map((item) => {
        const def = getItem(item.itemId)
        if (!def) return null
        const isMoving = mode.kind === 'place' && mode.movingId === item.id
        const isGround = def.category === 'path'
        return (
          <button
            key={item.id}
            type="button"
            style={cell(item.gridX, item.gridY, def.width, def.height)}
            onClick={() => onItemTap(item)}
            disabled={placing}
            aria-label={def.name}
            className={[
              'relative flex items-end justify-center p-[4%] transition focus-visible:z-30',
              isGround ? 'z-[1] p-0' : 'z-10',
              placing ? 'pointer-events-none' : 'hover:-translate-y-0.5',
              isMoving ? 'opacity-30' : '',
              item.id === justPlacedId ? 'animate-pop-in' : '',
            ].join(' ')}
          >
            <ItemArt art={def.art} width={def.width} height={def.height} className="h-full w-full" />
          </button>
        )
      })}

      {preview && (
        <div
          style={cell(preview.x, preview.y, preview.def.width, preview.def.height)}
          className={[
            'pointer-events-none z-20 rounded-lg p-[4%] ring-4',
            preview.check.ok ? 'bg-white/35 ring-gold' : 'bg-[#b64b3c]/35 ring-[#b64b3c]',
          ].join(' ')}
          aria-hidden="true"
        >
          <ItemArt art={preview.def.art} width={preview.def.width} height={preview.def.height} className="h-full w-full opacity-80" />
        </div>
      )}

      {/* Locked rows: square spacer cells give the rows their height. */}
      {Array.from({ length: lockedRows }, (_, r) => (
        <div key={`locked-${r}`} style={cell(0, unlockedRows + r)} className="aspect-square" aria-hidden="true" />
      ))}

      {upcoming && (
        <button
          type="button"
          onClick={onLockedTap}
          disabled={placing}
          style={{ gridColumn: `1 / span ${GRID_COLUMNS}`, gridRow: `${unlockedRows + 1} / span ${lockedRows}` }}
          className="relative z-10 flex flex-col items-center justify-center gap-1 bg-[repeating-linear-gradient(45deg,#7d9b76_0_14px,#76946f_14px_28px)] text-white"
          aria-label={`Locked land: ${upcoming.name}. Show how to unlock it.`}
        >
          <span className="relative text-3xl" aria-hidden="true">
            🔒
          </span>
          <span className="relative rounded-full bg-ink/40 px-3 py-1 text-sm font-extrabold">{upcoming.name} · tap to unlock</span>
        </button>
      )}
    </div>
  )
}

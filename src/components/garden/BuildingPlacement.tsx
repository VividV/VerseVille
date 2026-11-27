import type { GardenItemDefinition } from '../../types/garden'
import type { PlacementCheck } from '../../engine/garden/gardenGrid'
import { PLACEMENT_MESSAGES } from '../../engine/garden/gardenGrid'
import { Button } from '../common/Button'

/** The bar shown while placing or moving an item (spec §13.4). */
export function BuildingPlacement({
  def,
  moving,
  check,
  busy,
  onConfirm,
  onCancel,
}: {
  def: GardenItemDefinition
  moving: boolean
  check: PlacementCheck | null
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  let message = `Tap the garden where the ${def.name} should go.`
  if (check?.ok) message = 'Looks good! Confirm to place it here.'
  else if (check) message = PLACEMENT_MESSAGES[check.reason]

  return (
    <div className="sticky top-16 z-30 rounded-card bg-cream p-3 shadow-soft animate-pop-in">
      <p className="font-extrabold text-leaf-dark">{moving ? `Moving: ${def.name}` : `Placing: ${def.name}`}</p>
      <p role="status" aria-live="polite" className={`text-sm font-bold ${check && !check.ok ? 'text-[#b64b3c]' : 'text-ink-soft'}`}>
        {message}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={!check?.ok || busy}>
          Confirm
        </Button>
      </div>
    </div>
  )
}

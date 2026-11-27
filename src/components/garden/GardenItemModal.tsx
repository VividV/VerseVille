import { Link } from 'react-router-dom'
import type { PlacedGardenItem } from '../../types/garden'
import { getItem } from '../../engine/garden/catalog'
import { PERMANENT_ITEMS } from '../../engine/garden/startingGarden'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { VillageItemThumb } from '../village/VillageItemThumb'

/** Details and actions for a placed item (spec Screen 3: tap building / decoration). */
export function GardenItemModal({
  item,
  learnPath,
  onMove,
  onPutAway,
  onClose,
}: {
  item: PlacedGardenItem | null
  /** Where the Scripture Tree sends the player. */
  learnPath: string
  onMove: () => void
  onPutAway: () => void
  onClose: () => void
}) {
  const def = item ? getItem(item.itemId) : undefined
  if (!item || !def) return null
  const isTree = def.id === 'scripture_tree'

  return (
    <Modal
      open
      title={def.name}
      onClose={onClose}
      footer={
        <>
          {isTree && (
            <Link
              to={learnPath}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-leaf px-5 text-lg font-bold text-white shadow-soft"
            >
              Continue Learning
            </Link>
          )}
          <Button variant="secondary" fullWidth onClick={onMove}>
            Move
          </Button>
          {!PERMANENT_ITEMS.has(def.id) && (
            <Button variant="ghost" fullWidth onClick={onPutAway}>
              Put away
            </Button>
          )}
        </>
      }
    >
      <div className="flex items-center gap-4">
        <VillageItemThumb itemId={def.id} className="h-24 w-24 shrink-0" />
        <p className="text-ink-soft">{def.description}</p>
      </div>
    </Modal>
  )
}

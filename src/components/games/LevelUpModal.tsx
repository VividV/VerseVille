import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { levelTitle } from '../../engine/progression/playerLevel'
import { itemsUnlockedAtLevel } from '../../engine/garden/catalog'
import { VillageItemThumb } from '../village/VillageItemThumb'

/** Celebration when the player reaches a new level (spec §12). */
export function LevelUpModal({ level, open, onClose }: { level: number; open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      title="Level up!"
      onClose={onClose}
      footer={
        <Button size="lg" fullWidth onClick={onClose}>
          Wonderful!
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-6xl animate-pop-in" aria-hidden="true">
          🌳
        </span>
        <p className="text-2xl font-extrabold text-leaf-dark">Level {level}</p>
        <p className="font-bold text-ink-soft">{levelTitle(level)}</p>
        <p className="text-ink-soft">Your faithfulness is helping your garden grow.</p>
        {itemsUnlockedAtLevel(level).length > 0 && (
          <div className="mt-2 w-full">
            <p className="font-extrabold text-leaf-dark">New in the Garden Shop</p>
            <ul className="mt-2 flex flex-wrap justify-center gap-2">
              {itemsUnlockedAtLevel(level).map((item) => (
                <li key={item.id} className="flex w-20 flex-col items-center rounded-2xl bg-white p-2 text-xs font-bold">
                  <VillageItemThumb itemId={item.id} className="h-12 w-12" />
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}

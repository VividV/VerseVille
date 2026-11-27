import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { levelTitle } from '../../engine/progression/playerLevel'

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
      </div>
    </Modal>
  )
}

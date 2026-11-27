import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GardenItemModal } from '../components/garden/GardenItemModal'
import { ExpansionModal } from '../components/garden/ExpansionModal'
import { VillageScene } from '../components/village/VillageScene'
import { checkExpansion, nextExpansion } from '../engine/progression/gardenUnlocks'
import { getNextActivity } from '../engine/memorisation/reviewQueue'
import { getScriptures } from '../engine/scripture/scriptureCatalog'
import { useGameStore } from '../store/gameStore'
import { masteredCount, useGardenStore } from '../store/gardenStore'
import { useSettingsStore } from '../store/settingsStore'
import type { PlacedGardenItem } from '../types/garden'
import { nextActivityPath } from './nextActivity'

/** PROTOTYPE: the new isometric "Bible-lands village" look, using the player's real garden. */
export function VillagePreviewScreen() {
  const { items, expansionsUnlocked, unlockExpansion } = useGardenStore()
  const resources = useGameStore((s) => s.resources)
  const progressById = useGameStore((s) => s.scriptureProgress)
  const { preferredTranslation, reducedMotion } = useSettingsStore((s) => s.settings)
  const [selected, setSelected] = useState<PlacedGardenItem | null>(null)
  const [showLand, setShowLand] = useState(false)

  const prefersReduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const next = getNextActivity(getScriptures(preferredTranslation), progressById, new Date())
  const upcoming = nextExpansion(expansionsUnlocked)

  return (
    <div className="flex flex-col gap-3 animate-pop-in">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-leaf-dark">Your Village</h1>
        <span className="rounded-full bg-gold/40 px-3 py-1 text-xs font-extrabold text-ink">Preview</span>
      </div>
      <p className="text-sm text-ink-soft">A first look at the new village style. Drag to look around, pinch to zoom, tap anything.</p>

      <VillageScene
        items={items}
        expansionsUnlocked={expansionsUnlocked}
        animate={!reducedMotion && !prefersReduced}
        onItemTap={setSelected}
        onLockedTap={() => setShowLand(true)}
      />

      <Link to="/garden" className="inline-flex min-h-11 items-center justify-center rounded-full bg-cream font-bold text-leaf-dark ring-2 ring-leaf/40">
        Back to the classic garden
      </Link>

      <GardenItemModal
        item={selected}
        learnPath={next ? nextActivityPath(next) : '/scriptures'}
        onClose={() => setSelected(null)}
        onMove={() => setSelected(null)}
        onPutAway={() => setSelected(null)}
      />
      {showLand && upcoming && resources && (
        <ExpansionModal
          check={checkExpansion(upcoming, { level: resources.level, masteredCount: masteredCount(), coins: resources.coins })}
          onUnlock={unlockExpansion}
          onClose={() => setShowLand(false)}
        />
      )}
    </div>
  )
}

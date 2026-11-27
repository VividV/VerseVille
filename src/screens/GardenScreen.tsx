import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { GardenCanvas, type CanvasMode } from '../components/garden/GardenCanvas'
import { BuildingPlacement } from '../components/garden/BuildingPlacement'
import { GardenItemModal } from '../components/garden/GardenItemModal'
import { ExpansionModal } from '../components/garden/ExpansionModal'
import { ItemArt } from '../components/garden/itemArt'
import { getItem } from '../engine/garden/catalog'
import { GRID_COLUMNS, unlockedRowCount, validatePlacement } from '../engine/garden/gardenGrid'
import { checkExpansion, nextExpansion } from '../engine/progression/gardenUnlocks'
import { getDueReviews, getNextActivity } from '../engine/memorisation/reviewQueue'
import { getScriptures } from '../engine/scripture/scriptureCatalog'
import { useGameStore } from '../store/gameStore'
import { masteredCount, useGardenStore } from '../store/gardenStore'
import { useSettingsStore } from '../store/settingsStore'
import type { PlacedGardenItem } from '../types/garden'
import { nextActivityPath } from './nextActivity'
import { todayKey, useQuestStore } from '../store/questStore'
import { canClaim } from '../engine/quests/questEngine'
import { playSound } from '../services/audio/soundService'
import { Celebration } from '../components/common/Celebration'

const REASON_TEXT = {
  review: 'Due for review',
  continue: 'Pick up where you left off',
  new: 'A new verse to learn',
} as const

export function GardenScreen() {
  const [params, setParams] = useSearchParams()
  const profile = useGameStore((s) => s.profile)
  const resources = useGameStore((s) => s.resources)
  const progressById = useGameStore((s) => s.scriptureProgress)
  const { dailyGoal, preferredTranslation } = useSettingsStore((s) => s.settings)
  const { items, inventory, expansionsUnlocked, placeItem, moveItem, putAway, unlockExpansion } = useGardenStore()

  // "?place=bench" (from the shop) starts placement mode.
  const placeParam = params.get('place')
  const placeDef = placeParam && (inventory[placeParam] ?? 0) > 0 ? getItem(placeParam) : undefined
  const [mode, setMode] = useState<CanvasMode>(() => (placeDef ? { kind: 'place', def: placeDef, target: null } : { kind: 'view' }))
  const [selected, setSelected] = useState<PlacedGardenItem | null>(null)
  const [showExpansion, setShowExpansion] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [justPlacedId, setJustPlacedId] = useState<string | null>(null)
  const [celebrateLand, setCelebrateLand] = useState(false)

  const now = new Date()
  const dueCount = getDueReviews(progressById, now).length
  const next = getNextActivity(getScriptures(preferredTranslation), progressById, now)
  const learnPath = next ? nextActivityPath(next) : '/scriptures'
  const upcoming = nextExpansion(expansionsUnlocked)
  const inventoryEntries = Object.entries(inventory).filter(([, q]) => q > 0)
  const quests = useQuestStore((s) => s.quests)
  const today = useQuestStore((s) => s.days[todayKey()])
  const todaysQuests = quests.filter((q) => q.questDate === todayKey())
  const questsDone = todaysQuests.filter((q) => q.completedAt).length
  const toClaim = quests.filter(canClaim).length
  const studiedToday = Math.min(today?.studiedScriptureIds.length ?? 0, dailyGoal)

  const startPlacing = (itemId: string, movingId?: string) => {
    const def = getItem(itemId)
    if (!def) return
    setSelected(null)
    setNotice(null)
    setMode({ kind: 'place', def, movingId, target: null })
  }

  const cancelPlacing = () => {
    setMode({ kind: 'view' })
    if (placeParam) setParams({}, { replace: true })
  }

  const onTileTap = (x: number, y: number) => {
    if (mode.kind !== 'place') return
    // Keep the whole item inside the garden when tapping near the right or bottom edge.
    const maxY = unlockedRowCount(expansionsUnlocked) - mode.def.height
    setMode({
      ...mode,
      target: { x: Math.min(x, GRID_COLUMNS - mode.def.width), y: Math.max(0, Math.min(y, maxY)) },
    })
  }

  const confirm = async () => {
    if (mode.kind !== 'place' || !mode.target) return
    setBusy(true)
    try {
      if (mode.movingId) {
        await moveItem(mode.movingId, mode.target.x, mode.target.y)
        playSound('place')
        setJustPlacedId(mode.movingId)
        setNotice(`${mode.def.name} moved.`)
      } else {
        const placed = await placeItem(mode.def.id, mode.target.x, mode.target.y)
        playSound('place')
        setJustPlacedId(placed.id)
        setNotice(`${mode.def.name} placed in your garden!`)
      }
      cancelPlacing()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Could not place that.')
    } finally {
      setBusy(false)
    }
  }

  const check =
    mode.kind === 'place' && mode.target
      ? validatePlacement({ items, expansionsUnlocked }, mode.def, mode.target.x, mode.target.y, mode.movingId)
      : null

  return (
    <div className="flex flex-col gap-4 animate-pop-in">
      <h1 className="text-2xl font-extrabold text-leaf-dark">{profile?.displayName}'s Garden</h1>

      {mode.kind === 'place' && (
        <BuildingPlacement
          def={mode.def}
          moving={Boolean(mode.movingId)}
          check={check}
          busy={busy}
          onConfirm={confirm}
          onCancel={cancelPlacing}
        />
      )}
      {notice && mode.kind === 'view' && (
        <p role="status" className="rounded-2xl bg-leaf-light px-4 py-2 text-center font-bold text-leaf-dark">
          {notice}
        </p>
      )}

      <GardenCanvas
        items={items}
        expansionsUnlocked={expansionsUnlocked}
        mode={mode}
        justPlacedId={justPlacedId}
        onTileTap={onTileTap}
        onItemTap={(item) => setSelected(item)}
        onLockedTap={() => setShowExpansion(true)}
      />

      {mode.kind === 'view' && (
        <>
          <Link
            to="/village-preview"
            className="flex min-h-12 items-center justify-between gap-3 rounded-card bg-gradient-to-r from-[#F3D9A8] to-[#9FD0E6] px-4 py-3 font-extrabold text-ink shadow-soft"
          >
            <span>
              <span aria-hidden="true">🏘️ </span>Preview the new village look
            </span>
            <span aria-hidden="true">→</span>
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/shop"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold font-extrabold text-ink shadow-soft"
            >
              <span aria-hidden="true">🛒</span> Garden Shop
            </Link>
            <Link
              to="/scriptures"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cream font-extrabold text-leaf-dark ring-2 ring-leaf/40"
            >
              <span aria-hidden="true">📖</span> Scriptures
            </Link>
          </div>

          <Link
            to="/quests"
            className="flex min-h-14 items-center justify-between gap-3 rounded-card bg-cream px-4 py-3 shadow-soft hover:bg-leaf-light"
          >
            <span className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">
                🗒️
              </span>
              <span className="flex flex-col leading-tight">
                <span className="font-extrabold text-leaf-dark">Daily quests</span>
                <span className="text-sm text-ink-soft">
                  {questsDone}/{todaysQuests.length} done · Goal {studiedToday}/{dailyGoal}
                </span>
              </span>
            </span>
            {toClaim > 0 ? (
              <span className="rounded-full bg-gold px-3 py-1 text-sm font-extrabold text-ink">{toClaim} to claim</span>
            ) : (
              <span aria-hidden="true">→</span>
            )}
          </Link>

          {inventoryEntries.length > 0 && (
            <Card>
              <h2 className="text-lg font-extrabold text-leaf-dark">Ready to place</h2>
              <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {inventoryEntries.map(([itemId, quantity]) => {
                  const def = getItem(itemId)
                  if (!def) return null
                  return (
                    <li key={itemId}>
                      <button
                        type="button"
                        onClick={() => startPlacing(itemId)}
                        className="flex min-h-11 w-24 flex-col items-center gap-1 rounded-2xl bg-white p-2 text-xs font-bold text-ink shadow-sm hover:bg-leaf-light"
                        aria-label={`Place ${def.name} (${quantity} available)`}
                      >
                        <ItemArt art={def.art} width={def.width} height={def.height} className="h-12 w-12" />
                        <span className="truncate">{def.name}</span>
                        <span className="text-ink-soft">×{quantity}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}

          <Card>
            <h2 className="text-lg font-extrabold text-leaf-dark">Today's Scripture Journey</h2>
            <p className="mt-1 text-ink-soft">
              {dueCount > 0 ? (
                <>
                  <strong className="text-ink">{dueCount}</strong> {dueCount === 1 ? 'verse is' : 'verses are'} ready for
                  review.{' '}
                </>
              ) : (
                'No reviews due right now. '
              )}
              Your daily goal is <strong className="text-ink">{dailyGoal}</strong> {dailyGoal === 1 ? 'scripture' : 'scriptures'}.
            </p>
            {next ? (
              <Link
                to={nextActivityPath(next)}
                className="mt-3 flex min-h-14 w-full items-center justify-between gap-3 rounded-full bg-leaf px-5 text-white shadow-soft hover:bg-leaf-dark"
              >
                <span className="flex flex-col leading-tight">
                  <span className="text-lg font-extrabold">Continue Learning</span>
                  <span className="text-sm text-white">
                    {REASON_TEXT[next.reason]}: {next.scripture.reference}
                  </span>
                </span>
                <span aria-hidden="true" className="text-xl">
                  →
                </span>
              </Link>
            ) : (
              <p className="mt-3 font-bold text-leaf-dark">You've started every verse and nothing is due. Well done!</p>
            )}
          </Card>
        </>
      )}

      <GardenItemModal
        item={selected}
        learnPath={learnPath}
        onClose={() => setSelected(null)}
        onMove={() => selected && startPlacing(selected.itemId, selected.id)}
        onPutAway={async () => {
          if (!selected) return
          const def = getItem(selected.itemId)
          await putAway(selected.id)
          setSelected(null)
          setNotice(`${def?.name ?? 'Item'} put away. Find it under "Ready to place".`)
        }}
      />

      {celebrateLand && <Celebration />}
      {showExpansion && upcoming && resources && (
        <ExpansionModal
          check={checkExpansion(upcoming, { level: resources.level, masteredCount: masteredCount(), coins: resources.coins })}
          onUnlock={async () => {
            await unlockExpansion()
            playSound('levelUp')
            setCelebrateLand(true)
            setNotice(`The ${upcoming.name} is yours! New land to grow.`)
          }}
          onClose={() => setShowExpansion(false)}
        />
      )}
    </div>
  )
}

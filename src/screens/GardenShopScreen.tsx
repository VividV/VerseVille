import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { VillageItemThumb } from '../components/village/VillageItemThumb'
import { SHOP_CATEGORIES, getShopItems } from '../engine/garden/catalog'
import { checkPurchase, ownedCount } from '../engine/garden/shop'
import { useGameStore } from '../store/gameStore'
import { PURCHASE_MESSAGES, useGardenStore } from '../store/gardenStore'
import type { ItemCategory } from '../types/garden'
import { playSound } from '../services/audio/soundService'

export function GardenShopScreen() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const category = (SHOP_CATEGORIES.find((c) => c.id === params.get('category'))?.id ?? 'decoration') as ItemCategory
  const resources = useGameStore((s) => s.resources)
  const { items: placed, inventory, buyItem } = useGardenStore()
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  if (!resources) return null

  const buy = async (itemId: string, name: string) => {
    setBusyId(itemId)
    try {
      await buyItem(itemId)
      playSound('reward')
      setMessage(`${name} bought! Tap "Place" to put it in your garden.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not buy that.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 animate-pop-in">
      <h1 className="text-2xl font-extrabold text-leaf-dark">Garden Shop</h1>

      <div role="group" aria-label="Categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {SHOP_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={category === c.id}
            onClick={() => {
              setParams({ category: c.id }, { replace: true })
              setMessage(null)
            }}
            className={[
              'min-h-11 shrink-0 rounded-full px-4 text-sm font-bold transition',
              category === c.id ? 'bg-leaf text-white shadow-soft' : 'bg-cream text-ink-soft ring-1 ring-leaf-light',
            ].join(' ')}
          >
            {c.label}
          </button>
        ))}
      </div>

      {message && (
        <p role="status" className="rounded-2xl bg-leaf-light px-4 py-2 text-center font-bold text-leaf-dark">
          {message}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {getShopItems(category).map((item) => {
          const owned = ownedCount(item.id, inventory, placed)
          const inBag = inventory[item.id] ?? 0
          const check = checkPurchase({ item, level: resources.level, resources, owned })
          const lockedByLevel = !check.ok && check.reason === 'level'
          return (
            <li key={item.id} className="flex gap-3 rounded-card bg-cream p-3 shadow-soft">
              <div className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#E9D6A6] p-1 ${lockedByLevel ? 'opacity-50 grayscale' : ''}`}>
                <VillageItemThumb itemId={item.id} className="h-full w-full" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 className="font-extrabold text-leaf-dark">{item.name}</h2>
                <p className="text-sm text-ink-soft">{item.description}</p>
                <p className="flex flex-wrap items-center gap-x-3 text-sm font-bold text-ink">
                  <span>
                    <span aria-hidden="true">🪙</span> {item.coinCost}
                    <span className="sr-only"> coins</span>
                  </span>
                  {item.seedCost > 0 && (
                    <span>
                      <span aria-hidden="true">🌰</span> {item.seedCost}
                      <span className="sr-only"> seeds</span>
                    </span>
                  )}
                  <span className="font-semibold text-ink-soft">
                    {item.width}×{item.height}
                  </span>
                </p>
                {lockedByLevel && <p className="text-sm font-bold text-ink-soft">🔒 Unlocks at level {item.unlockLevel}</p>}
                {owned > 0 && (
                  <p className="text-sm font-bold text-leaf-dark">
                    {item.isUnique ? 'Owned' : `Owned: ${owned}`}
                    {inBag > 0 && ` · ${inBag} ready to place`}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap gap-2">
                  {!(item.isUnique && owned > 0) && !lockedByLevel && (
                    <Button
                      variant="gold"
                      disabled={!check.ok || busyId === item.id}
                      onClick={() => buy(item.id, item.name)}
                      aria-describedby={!check.ok ? `why-${item.id}` : undefined}
                    >
                      Buy
                    </Button>
                  )}
                  {inBag > 0 && (
                    <Button variant="secondary" onClick={() => navigate(`/garden?place=${item.id}`)}>
                      Place
                    </Button>
                  )}
                </div>
                {!check.ok && check.reason === 'cannot-afford' && (
                  <p id={`why-${item.id}`} className="text-xs text-ink-soft">
                    {PURCHASE_MESSAGES['cannot-afford']}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

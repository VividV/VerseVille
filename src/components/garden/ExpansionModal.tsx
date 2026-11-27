import { useState } from 'react'
import type { ExpansionCheck } from '../../engine/progression/gardenUnlocks'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'

/** Requirements for the next piece of land (spec Screen 3: tap locked land, §13.5). */
export function ExpansionModal({
  check,
  onUnlock,
  onClose,
}: {
  check: ExpansionCheck | null
  onUnlock: () => Promise<void>
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!check) return null

  const unlock = async () => {
    setBusy(true)
    setError(null)
    try {
      await onUnlock()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unlock the land.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      title={`Unlock the ${check.expansion.name}`}
      onClose={onClose}
      footer={
        <>
          <Button size="lg" fullWidth disabled={!check.canUnlock || busy} onClick={unlock}>
            {check.canUnlock ? `Unlock for ${check.expansion.coinCost} coins` : 'Keep growing to unlock'}
          </Button>
          <Button variant="ghost" fullWidth onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <p className="text-ink-soft">
        {check.expansion.rows} more rows of land for your garden. You'll need:
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {check.requirements.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-2">
            <span className="flex items-center gap-2 font-bold">
              <span aria-hidden="true">{r.met ? '✅' : '⬜'}</span>
              {r.label}
              <span className="sr-only">{r.met ? '(done)' : '(not yet)'}</span>
            </span>
            <span className="text-sm tabular-nums text-ink-soft">
              {Math.min(r.current, r.required)}/{r.required}
            </span>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 font-bold text-[#b64b3c]">
          {error}
        </p>
      )}
    </Modal>
  )
}

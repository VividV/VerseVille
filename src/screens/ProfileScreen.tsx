import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Modal } from '../components/common/Modal'
import { MAX_NAME_LENGTH, useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import type { TextSize } from '../types/player'
import { DailyGoalPicker, TranslationPicker } from './settingsFields'

function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4">
      <div>
        <label htmlFor={id} className="font-bold text-ink">
          {label}
        </label>
        {description && <p className="text-sm text-ink-soft">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${checked ? 'bg-leaf' : 'bg-[#c9cfc4]'}`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] ${checked ? 'left-7' : 'left-1'}`}
        />
      </button>
    </div>
  )
}

const TEXT_SIZES: { value: TextSize; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Large' },
  { value: 'extra-large', label: 'Extra large' },
]

export function ProfileScreen() {
  const navigate = useNavigate()
  const profile = useGameStore((s) => s.profile)
  const updateDisplayName = useGameStore((s) => s.updateDisplayName)
  const resetProgress = useGameStore((s) => s.resetProgress)
  const settings = useSettingsStore((s) => s.settings)
  const updateSettings = useSettingsStore((s) => s.updateSettings)

  const [name, setName] = useState(profile?.displayName ?? '')
  const [nameMessage, setNameMessage] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  const saveName = async () => {
    try {
      await updateDisplayName(name)
      setNameMessage('Name saved.')
    } catch (err) {
      setNameMessage(err instanceof Error ? err.message : 'Could not save your name.')
    }
  }

  const doReset = async () => {
    setResetting(true)
    await resetProgress()
    navigate('/welcome', { replace: true })
  }

  return (
    <div className="flex flex-col gap-4 animate-pop-in">
      <h1 className="text-2xl font-extrabold text-leaf-dark">Profile &amp; Settings</h1>

      <Link
        to="/progress"
        className="flex min-h-14 items-center justify-between rounded-card bg-leaf px-4 font-extrabold text-white shadow-soft hover:bg-leaf-dark"
      >
        <span>
          <span aria-hidden="true">📈 </span>My Progress
        </span>
        <span aria-hidden="true">→</span>
      </Link>

      <Card>
        <label htmlFor="profileName" className="block text-lg font-bold text-leaf-dark">
          Display name
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="profileName"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => {
              setName(e.target.value)
              setNameMessage(null)
            }}
            className="min-h-12 w-full min-w-0 rounded-2xl border-2 border-leaf-light bg-white px-4 text-lg focus:border-leaf focus:outline-none"
          />
          <Button onClick={saveName} disabled={name.trim() === profile?.displayName}>
            Save
          </Button>
        </div>
        {nameMessage && (
          <p role="status" className="mt-2 text-sm font-semibold text-ink-soft">
            {nameMessage}
          </p>
        )}
      </Card>

      <Card>
        <TranslationPicker
          value={settings.preferredTranslation}
          onChange={(preferredTranslation) => updateSettings({ preferredTranslation })}
        />
      </Card>

      <Card>
        <DailyGoalPicker value={settings.dailyGoal} onChange={(dailyGoal) => updateSettings({ dailyGoal })} />
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-leaf-dark">Sound &amp; notifications</h2>
        <Toggle
          id="sound"
          label="Sound effects"
          description="Gentle chimes for answers, rewards and your garden."
          checked={settings.soundEnabled}
          onChange={(soundEnabled) => updateSettings({ soundEnabled })}
        />
        <Toggle
          id="notifications"
          label="Reminders"
          description="Saved for later. VerseVille doesn't send notifications in this version."
          checked={settings.notificationsEnabled}
          onChange={(notificationsEnabled) => updateSettings({ notificationsEnabled })}
        />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold text-leaf-dark">Accessibility</h2>
        <fieldset>
          <legend className="font-bold text-ink">Text size</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {TEXT_SIZES.map((t) => (
              <Button
                key={t.value}
                variant={settings.textSize === t.value ? 'primary' : 'secondary'}
                aria-pressed={settings.textSize === t.value}
                onClick={() => updateSettings({ textSize: t.value })}
                className="px-2 text-sm"
              >
                {t.label}
              </Button>
            ))}
          </div>
        </fieldset>
        <Toggle
          id="contrast"
          label="High-contrast text"
          checked={settings.highContrast}
          onChange={(highContrast) => updateSettings({ highContrast })}
        />
        <Toggle
          id="motion"
          label="Reduce motion"
          description="Turns off swaying trees, confetti and other animations."
          checked={settings.reducedMotion}
          onChange={(reducedMotion) => updateSettings({ reducedMotion })}
        />
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-leaf-dark">Account &amp; privacy</h2>
        <p className="mt-1 text-ink-soft">
          You're playing as a guest. Your progress is saved only on this device and is not sent anywhere. Optional
          accounts for saving across devices are planned for a later update.
        </p>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-leaf-dark">Reset progress</h2>
        <p className="mt-1 mb-3 text-ink-soft">Erase your garden, resources and scripture progress on this device.</p>
        <Button variant="danger" fullWidth onClick={() => setConfirmReset(true)}>
          Reset progress
        </Button>
      </Card>

      <Modal
        open={confirmReset}
        title="Reset all progress?"
        onClose={() => setConfirmReset(false)}
        footer={
          <>
            <Button variant="danger" fullWidth onClick={doReset} disabled={resetting}>
              {resetting ? 'Resetting…' : 'Yes, erase everything'}
            </Button>
            <Button variant="secondary" fullWidth onClick={() => setConfirmReset(false)}>
              Keep my progress
            </Button>
          </>
        }
      >
        This permanently deletes your profile, garden and scripture progress from this device. It can't be undone.
      </Modal>
    </div>
  )
}

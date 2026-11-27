import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { MAX_NAME_LENGTH, cleanDisplayName, useGameStore } from '../store/gameStore'
import { DailyGoalPicker, TranslationPicker } from './settingsFields'
import type { DailyGoal, TranslationCode } from '../types/player'

export function OnboardingScreen() {
  const navigate = useNavigate()
  const createGuestPlayer = useGameStore((s) => s.createGuestPlayer)
  const [displayName, setDisplayName] = useState('')
  const [translation, setTranslation] = useState<TranslationCode>('KJV')
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(3)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!cleanDisplayName(displayName)) {
      setError('Please enter a display name.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createGuestPlayer({ displayName, preferredTranslation: translation, dailyGoal })
      navigate('/garden', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <main className="min-h-dvh bg-paper">
      <form onSubmit={onSubmit} className="mx-auto flex max-w-md flex-col gap-5 px-5 py-8" noValidate>
        <header className="text-center">
          <span className="text-5xl" aria-hidden="true">
            🌱
          </span>
          <h1 className="mt-2 text-3xl font-extrabold text-leaf-dark">Welcome, gardener</h1>
          <p className="mt-1 text-ink-soft">A few quick choices and your garden is ready.</p>
        </header>

        <Card>
          <label htmlFor="displayName" className="block text-lg font-bold text-leaf-dark">
            What should we call you?
          </label>
          <input
            id="displayName"
            name="displayName"
            autoComplete="nickname"
            maxLength={MAX_NAME_LENGTH}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'onboarding-error' : undefined}
            className="mt-2 min-h-12 w-full rounded-2xl border-2 border-leaf-light bg-white px-4 text-lg focus:border-leaf focus:outline-none"
            placeholder="Your name"
          />
        </Card>

        <Card>
          <TranslationPicker value={translation} onChange={setTranslation} />
        </Card>

        <Card>
          <DailyGoalPicker value={dailyGoal} onChange={setDailyGoal} />
        </Card>

        {error && (
          <p id="onboarding-error" role="alert" className="text-center font-bold text-[#b64b3c]">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth disabled={saving}>
          {saving ? 'Preparing your garden…' : 'Enter My Garden'}
        </Button>
      </form>
    </main>
  )
}

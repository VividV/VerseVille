import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from '../app/providers'
import { createTestRouter } from '../app/router'
import { useGameStore } from '../store/gameStore'
import { DEFAULT_SETTINGS, useSettingsStore } from '../store/settingsStore'

async function openPreview(reducedMotion = false) {
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
  useGameStore.setState({ status: 'loading', profile: null, resources: null, scriptureProgress: {}, rewardTransactions: [], lastGame: null })
  await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 3 })
  if (reducedMotion) await useSettingsStore.getState().updateSettings({ reducedMotion: true })
  const router = createTestRouter('/village-preview')
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  await screen.findByRole('group', { name: 'Your village' })
  return router
}

describe('village preview (prototype)', () => {
  it('draws the real garden items as tappable buttons', async () => {
    await openPreview()
    expect(screen.getByRole('button', { name: 'Scripture Tree' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Small Cottage' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Flower Bed' })).toHaveLength(3)
  })

  it('the Scripture Tree opens learning and locked land shows its requirements', async () => {
    const user = userEvent.setup()
    await openPreview()
    await user.click(screen.getByRole('button', { name: 'Scripture Tree' }))
    expect(screen.getByRole('link', { name: 'Continue Learning' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: /meadow · tap to unlock/i }))
    expect(screen.getByRole('dialog', { name: 'Unlock the Meadow' })).toBeInTheDocument()
  })

  it('has no animations when Reduce motion is on', async () => {
    await openPreview(true)
    const svg = screen.getByRole('group', { name: 'Your village' })
    expect(svg.querySelectorAll('animate, animateMotion, animateTransform')).toHaveLength(0)
  })

  it('animates village life normally', async () => {
    await openPreview()
    const svg = screen.getByRole('group', { name: 'Your village' })
    expect(svg.querySelectorAll('animate, animateMotion, animateTransform').length).toBeGreaterThan(10)
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from './providers'
import { createTestRouter } from './router'
import { useGameStore } from '../store/gameStore'
import { DEFAULT_SETTINGS, useSettingsStore } from '../store/settingsStore'

function renderApp(path: string) {
  useGameStore.setState({ status: 'loading', profile: null, resources: null, errorMessage: null, scriptureProgress: {} })
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
  const router = createTestRouter(path)
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

async function onboard(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Begin Your Journey' }))
  await user.type(screen.getByLabelText('What should we call you?'), 'Grace')
  await user.click(screen.getByRole('button', { name: 'Enter My Garden' }))
  await screen.findByRole('heading', { name: /grace's garden/i })
}

describe('app navigation', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-text-size')
  })

  it('sends new players to the welcome screen', async () => {
    const router = renderApp('/garden')
    expect(await screen.findByRole('heading', { name: 'VerseVille' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/welcome')
  })

  it('onboards a guest, shows starting resources and navigates between tabs', async () => {
    const user = userEvent.setup()
    const router = renderApp('/welcome')
    await onboard(user)

    expect(screen.getByText('100 coins')).toBeInTheDocument()
    expect(screen.getByText('5 seeds')).toBeInTheDocument()
    expect(screen.getByText('Level 1')).toBeInTheDocument()

    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Scriptures' }))
    expect(router.state.location.pathname).toBe('/scriptures')
    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Quests' }))
    expect(router.state.location.pathname).toBe('/quests')
    await user.click(screen.getByRole('link', { name: 'Settings' }))
    expect(await screen.findByRole('heading', { name: /profile & settings/i })).toBeInTheDocument()
  })

  it('does not show onboarding again to a returning player', async () => {
    const user = userEvent.setup()
    renderApp('/welcome')
    await onboard(user)
    // "Refresh" the app at the onboarding URL.
    const router = renderApp('/onboarding')
    await screen.findAllByRole('heading', { name: /grace's garden/i })
    expect(router.state.location.pathname).toBe('/garden')
  })

  it('applies the text-size setting and requires confirmation to reset', async () => {
    const user = userEvent.setup()
    const router = renderApp('/welcome')
    await onboard(user)
    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Profile' }))

    await user.click(await screen.findByRole('button', { name: 'Large' }))
    expect(document.documentElement.dataset.textSize).toBe('large')

    await user.click(screen.getByRole('button', { name: 'Reset progress' }))
    expect(screen.getByRole('dialog', { name: 'Reset all progress?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep my progress' }))
    expect(useGameStore.getState().profile).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Reset progress' }))
    await user.click(screen.getByRole('button', { name: 'Yes, erase everything' }))
    await screen.findByRole('button', { name: 'Begin Your Journey' })
    expect(router.state.location.pathname).toBe('/welcome')
    expect(useGameStore.getState().profile).toBeNull()
  })
})

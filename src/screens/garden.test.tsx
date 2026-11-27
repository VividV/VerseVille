import { describe, expect, it } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from '../app/providers'
import { createTestRouter } from '../app/router'
import { useGameStore } from '../store/gameStore'
import { useGardenStore } from '../store/gardenStore'
import { DEFAULT_SETTINGS, useSettingsStore } from '../store/settingsStore'

async function renderAsPlayer(path: string) {
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
  useGameStore.setState({ status: 'loading', profile: null, resources: null, scriptureProgress: {}, rewardTransactions: [], lastGame: null })
  await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 3 })
  const router = createTestRouter(path)
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

describe('garden screens', () => {
  it('shows the starting garden and the Scripture Tree opens learning', async () => {
    const user = userEvent.setup()
    const router = await renderAsPlayer('/garden')
    const garden = await screen.findByRole('group', { name: 'Your garden' })
    expect(garden).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Flower Bed' })).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'Scripture Tree' }))
    await user.click(screen.getByRole('link', { name: 'Continue Learning' }))
    expect(router.state.location.pathname).toBe('/scriptures/psalm-23-1-kjv')
  })

  it('buys a bench in the shop and places it in the garden', async () => {
    const user = userEvent.setup()
    const router = await renderAsPlayer('/shop')
    // Decorations tab is default; the first item is the Flower Bed (20 coins, 1 seed).
    await user.click((await screen.findAllByRole('button', { name: 'Buy' }))[0])
    expect(await screen.findByText(/bought!/)).toBeInTheDocument()
    expect(screen.getByText('80 coins')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Place' }))
    expect(router.state.location.pathname).toBe('/garden')

    expect(screen.getByText(/Placing: Flower Bed/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Place at row 2, column 2' })) // on the tree
    expect(screen.getByRole('status')).toHaveTextContent('Something is already there.')
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Place at row 7, column 1' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Flower Bed' })).toHaveLength(4))
    expect(useGardenStore.getState().inventory).toEqual({})
  })

  it('shows land requirements when tapping locked land', async () => {
    const user = userEvent.setup()
    await renderAsPlayer('/garden')
    await user.click(await screen.findByRole('button', { name: /meadow · tap to unlock/i }))
    expect(screen.getByRole('dialog', { name: 'Unlock the Meadow' })).toBeInTheDocument()
    expect(screen.getByText('Reach level 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keep growing to unlock' })).toBeDisabled()
  })

  it('unique buildings cannot be bought twice', async () => {
    const user = userEvent.setup()
    await renderAsPlayer('/shop?category=building')
    await screen.findByRole('heading', { name: 'Garden Shop' }) // wait until loading has finished
    act(() => useGameStore.setState({ resources: { ...useGameStore.getState().resources!, level: 2, xp: 200, coins: 1000 } }))
    const buys = await screen.findAllByRole('button', { name: 'Buy' })
    await user.click(buys[0]) // Village Well (unique)
    await screen.findByText(/bought!/)
    expect(screen.getByText('Owned · 1 ready to place')).toBeInTheDocument()
  })
})

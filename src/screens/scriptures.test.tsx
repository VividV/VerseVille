import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from '../app/providers'
import { createTestRouter } from '../app/router'
import { useGameStore } from '../store/gameStore'
import { DEFAULT_SETTINGS, useSettingsStore } from '../store/settingsStore'

async function renderAsPlayer(path: string) {
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
  useGameStore.setState({ status: 'loading', profile: null, resources: null, scriptureProgress: {} })
  await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 3 })
  const router = createTestRouter(path)
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

describe('Scripture library screen', () => {
  beforeEach(() => {
    useGameStore.setState({ profile: null })
  })

  it('lists all scriptures and searches by reference', async () => {
    const user = userEvent.setup()
    await renderAsPlayer('/scriptures')
    expect(await screen.findByText('66 scriptures')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Search scriptures'), 'John 3:16')
    expect(screen.getByText('1 scripture')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'John 3:16' })).toBeInTheDocument()
  })

  it('filters by topic and status, and can clear filters from the empty state', async () => {
    const user = userEvent.setup()
    const router = await renderAsPlayer('/scriptures')
    const topics = await screen.findByRole('group', { name: 'Topics' })
    await user.click(within(topics).getByRole('button', { name: /^peace$/i }))
    expect(router.state.location.search).toBe('?topic=peace')
    expect(screen.queryByRole('heading', { name: 'John 3:16' })).not.toBeInTheDocument()

    const statuses = screen.getByRole('group', { name: 'Learning status' })
    await user.click(within(statuses).getByRole('button', { name: 'Mastered' }))
    expect(screen.getByText('0 scriptures')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear search and filters' }))
    expect(screen.getByText('66 scriptures')).toBeInTheDocument()
  })

  it('opens a scripture detail with explanation, progress and related scriptures', async () => {
    const user = userEvent.setup()
    const router = await renderAsPlayer('/scriptures?q=shepherd')
    await user.click(await screen.findByRole('link', { name: /psalm 23:1/i }))
    expect(router.state.location.pathname).toBe('/scriptures/psalm-23-1-kjv')

    expect(screen.getByRole('heading', { level: 1, name: 'Psalm 23:1' })).toBeInTheDocument()
    expect(screen.getByText('The LORD is my shepherd; I shall not want.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /what it means/i })).toBeInTheDocument()
    expect(screen.getByText("You haven't started this scripture yet.")).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /john 10:11/i }))
    expect(router.state.location.pathname).toBe('/scriptures/john-10-11-kjv')

    await user.click(screen.getByRole('button', { name: 'Back' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(router.state.location.pathname).toBe('/scriptures')
    expect(router.state.location.search).toBe('?q=shepherd')
  })

  it('shows a friendly message for an unknown scripture', async () => {
    await renderAsPlayer('/scriptures/not-a-verse')
    expect(await screen.findByRole('heading', { name: 'Scripture not found' })).toBeInTheDocument()
  })
})

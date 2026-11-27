import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from '../app/providers'
import { createTestRouter } from '../app/router'
import { useGameStore } from './gameStore'
import { DEFAULT_SETTINGS, useSettingsStore } from './settingsStore'
import { closeDatabase } from '../services/persistence/localDatabase'
import { createGameSession } from '../engine/games/gameSession'
import type { GameType } from '../types/games'

function forgetMemory() {
  useGameStore.setState({ status: 'loading', profile: null, resources: null, scriptureProgress: {}, lastGame: null })
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
}

async function finish(gameType: GameType, accuracy: number, when: Date) {
  const session = createGameSession({
    scriptureId: 'psalm-23-1-kjv',
    gameType,
    accuracy,
    details: { kind: 'assisted', totalItems: 1, correctFirstTry: 1, hintsUsed: 0, mistakes: 0 },
    startedAt: when,
    now: when,
  })
  return { session, result: await useGameStore.getState().completeGame(session) }
}

describe('learning progress persistence (spec §20)', () => {
  afterEach(() => vi.useRealTimers())

  it('keeps scripture progress after closing and reopening the browser', async () => {
    forgetMemory()
    await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 3 })
    await finish('missing-words', 1, new Date('2026-11-27T10:00:00'))
    await finish('word-order', 1, new Date('2026-11-27T10:05:00'))

    forgetMemory()
    await closeDatabase()
    await useGameStore.getState().hydrate()
    expect(useGameStore.getState().scriptureProgress['psalm-23-1-kjv']).toMatchObject({
      masteryScore: 25,
      status: 'growing',
      completedGameTypes: ['missing-words', 'word-order'],
    })
  })

  it('applies a finished game only once, even if saved twice', async () => {
    forgetMemory()
    await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 3 })
    const { session } = await finish('missing-words', 1, new Date('2026-11-27T10:00:00'))
    await useGameStore.getState().completeGame(session) // same session again
    forgetMemory()
    await useGameStore.getState().hydrate()
    await expect(useGameStore.getState().completeGame(session)).rejects.toThrow('already been saved')
    expect(useGameStore.getState().scriptureProgress['psalm-23-1-kjv'].totalAttempts).toBe(1)
  })

  it('returning the next day: the garden shows the review and Continue Learning opens it', async () => {
    forgetMemory()
    await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 3 })
    await finish('missing-words', 1, new Date('2026-11-27T10:00:00'))
    await finish('word-order', 1, new Date('2026-11-27T10:05:00'))
    await finish('recall', 1, new Date('2026-11-27T10:10:00'))

    // Next morning, after reopening the browser.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-28T08:00:00'))
    forgetMemory()
    await closeDatabase()

    const user = userEvent.setup()
    const router = createTestRouter('/garden')
    render(
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>,
    )
    expect(await screen.findByText(/verse is ready for review/)).toBeInTheDocument()
    const cont = screen.getByRole('link', { name: /continue learning/i })
    expect(cont).toHaveTextContent('Due for review: Psalm 23:1')
    await user.click(cont)
    // Strong verse → Verse Recall.
    expect(router.state.location.pathname).toBe('/games/recall/psalm-23-1-kjv')
  })
})

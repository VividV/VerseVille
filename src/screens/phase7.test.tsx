import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from '../app/providers'
import { createTestRouter } from '../app/router'
import { useGameStore } from '../store/gameStore'
import { useQuestStore } from '../store/questStore'
import { DEFAULT_SETTINGS, useSettingsStore } from '../store/settingsStore'
import { createGameSession } from '../engine/games/gameSession'
import { saveCompletedGame } from '../services/persistence/saveService'
import { createProgress } from '../engine/memorisation/learningEngine'

async function newPlayer() {
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
  useGameStore.setState({ status: 'loading', profile: null, resources: null, scriptureProgress: {}, rewardTransactions: [], lastGame: null })
  useQuestStore.setState({ quests: [], days: {} })
  await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 1 })
}

function renderAt(path: string) {
  const router = createTestRouter(path)
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

describe('Phase 7 screens', () => {
  it('Quests: shows today\'s quests, and a completed quest can be claimed', async () => {
    await newPlayer()
    const now = new Date()
    await useGameStore.getState().completeGame(
      createGameSession({
        scriptureId: 'psalm-23-1-kjv',
        gameType: 'recall',
        accuracy: 1,
        details: { kind: 'assisted', totalItems: 1, correctFirstTry: 1, hintsUsed: 0, mistakes: 0 },
        startedAt: now,
        now,
      }),
    )
    const user = userEvent.setup()
    renderAt('/quests')
    const recall = await screen.findByRole('article', { name: 'From the Heart' })
    const goal = screen.getByRole('article', { name: "Today's Scripture Goal" })
    expect(within(goal).getByRole('button', { name: 'Claim reward' })).toBeInTheDocument() // goal of 1 reached
    expect(screen.getByText('🎉 Goal complete for today!')).toBeInTheDocument()
    const coins = useGameStore.getState().resources!.coins
    await user.click(within(recall).getByRole('button', { name: 'Claim reward' }))
    expect(await within(recall).findByText('✓ Reward claimed')).toBeInTheDocument()
    expect(useGameStore.getState().resources!.coins).toBe(coins + 10)
    expect(within(screen.getByRole('article', { name: 'Plant a New Seed' })).queryByRole('button')).toBeNull()
  })

  it('Collection: empty at first, then shows mastered verses as cards', async () => {
    await newPlayer()
    renderAt('/collection')
    expect(await screen.findByRole('heading', { name: 'Your collection is waiting' })).toBeInTheDocument()
  })

  it('Collection: lists mastered cards with filters', async () => {
    await newPlayer()
    const base = createProgress('psalm-23-1-kjv', new Date())
    const now = new Date()
    // Save a mastered scripture as if earned.
    await saveCompletedGame({
      session: createGameSession({
        scriptureId: 'psalm-23-1-kjv',
        gameType: 'recall',
        accuracy: 1,
        details: { kind: 'assisted', totalItems: 1, correctFirstTry: 1, hintsUsed: 0, mistakes: 0 },
        startedAt: now,
        now,
      }),
      progress: { ...base, status: 'mastered', masteryScore: 100, masteredAt: now.toISOString(), learnedAt: now.toISOString() },
      transactions: [],
      resources: useGameStore.getState().resources!,
    })
    const user = userEvent.setup()
    renderAt('/collection')
    expect(await screen.findByText('1 verse collected')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /psalm 23:1/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Needs a review' }))
    expect(screen.getByText('No cards match these filters.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mastered' }))
    expect(screen.getByRole('link', { name: /psalm 23:1/i })).toBeInTheDocument()
  })

  it('Progress: shows recall first and the other numbers', async () => {
    await newPlayer()
    const now = new Date()
    for (const gameType of ['missing-words', 'word-order', 'recall'] as const) {
      await useGameStore.getState().completeGame(
        createGameSession({
          scriptureId: 'psalm-23-1-kjv',
          gameType,
          accuracy: gameType === 'recall' ? 0.9 : 1,
          details: { kind: 'assisted', totalItems: 1, correctFirstTry: 1, hintsUsed: 0, mistakes: 0 },
          startedAt: now,
          now,
        }),
      )
    }
    renderAt('/progress')
    expect(await screen.findByText('Verses you can recall')).toBeInTheDocument()
    expect(screen.getByText(/90%/)).toBeInTheDocument()
    expect(screen.getByText('Scriptures learned').previousSibling).toHaveTextContent('1')
    expect(screen.getByText('Day streak').previousSibling).toHaveTextContent('1')
    expect(screen.getByText(/Garden stage: Young Garden/)).toBeInTheDocument()
  })
})

/**
 * Spec §21 "MVP definition of done", played through the real screens:
 *  1 open  2 guest profile  3 garden  4 learn a scripture  5 understand it
 *  6 Missing Words  7 Word Order  8 recall  9 earn XP/coins/seeds
 * 10 progress updates  11 review on a later date  12 earn enough to build
 * 13 garden changes  14 close the game  15 return and continue
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from '../app/providers'
import { createTestRouter } from '../app/router'
import { useGameStore } from '../store/gameStore'
import { useGardenStore } from '../store/gardenStore'
import { useQuestStore } from '../store/questStore'
import { DEFAULT_SETTINGS, useSettingsStore } from '../store/settingsStore'
import { closeDatabase } from '../services/persistence/localDatabase'
import { tokeniseVerse } from '../engine/games/verseTokens'
import { getScriptureById } from '../engine/scripture/scriptureCatalog'

const VERSE_ID = 'psalm-23-1-kjv'
const verse = getScriptureById(VERSE_ID)!

function forgetEverythingInMemory() {
  useGameStore.setState({ status: 'loading', profile: null, resources: null, scriptureProgress: {}, rewardTransactions: [], lastGame: null })
  useGardenStore.setState({ items: [], inventory: {}, expansionsUnlocked: 0 })
  useQuestStore.setState({ quests: [], days: {} })
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
}

function openApp(path: string) {
  const router = createTestRouter(path)
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

const tiles = () => within(screen.getByRole('region', { name: 'Word tiles' }))

describe('MVP definition of done (spec §21)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('a new player can learn, earn, build, leave, and come back to review', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-27T09:00:00'))
    forgetEverythingInMemory()
    const user = userEvent.setup()

    // 1. Open VerseVille.
    openApp('/')
    await user.click(await screen.findByRole('button', { name: 'Begin Your Journey' }))

    // 2. Create a guest profile.
    await user.type(screen.getByLabelText('What should we call you?'), 'Grace')
    await user.click(screen.getByRole('button', { name: 'Enter My Garden' }))

    // 3. Enter the garden.
    await screen.findByRole('heading', { name: "Grace's Garden" })
    expect(screen.getByRole('group', { name: 'Your garden' })).toBeInTheDocument()
    const startCoins = useGameStore.getState().resources!.coins
    const startItems = useGardenStore.getState().items.length

    // 4–5. Learn a scripture and understand its meaning.
    await user.click(screen.getByRole('link', { name: /continue learning/i }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Psalm 23:1' })).toBeInTheDocument()
    expect(screen.getByText(verse.text)).toBeInTheDocument()
    expect(screen.getByText(verse.explanation)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Learn this scripture' }))

    // 6. Play Missing Words, answering correctly: each blank's position in the verse tells us its word.
    await user.click(await screen.findByRole('link', { name: /missing words/i }))
    const choices = await screen.findByRole('group', { name: 'Word choices' })
    const tokens = tokeniseVerse(verse.text)
    for (const blank of screen.getAllByRole('button', { name: /^Blank \d+ of \d+/ })) {
      const tokenSpan = blank.parentElement!
      const index = Array.from(tokenSpan.parentElement!.children).indexOf(tokenSpan)
      await user.click(blank)
      const tile = within(choices)
        .getAllByRole('button')
        .find((b) => b.textContent === tokens[index].word && !(b as HTMLButtonElement).disabled)!
      await user.click(tile)
    }
    await user.click(screen.getByRole('button', { name: 'Finish' }))
    expect(await screen.findByText('100%')).toBeInTheDocument()

    // 7. Play Word Order.
    await user.click(screen.getByRole('link', { name: /continue: word order/i }))
    await screen.findByRole('region', { name: 'Word tiles' })
    for (const word of verse.text.split(' ')) await user.click(tiles().getAllByRole('button', { name: word })[0])
    await user.click(screen.getByRole('button', { name: 'Finish' }))
    expect(await screen.findByText('100%')).toBeInTheDocument()

    // 8. Attempt independent recall.
    await user.click(screen.getByRole('link', { name: /continue: verse recall/i }))
    await user.type(await screen.findByLabelText('Type the verse'), verse.text)
    await user.click(screen.getByRole('button', { name: 'Check my recall' }))
    expect(await screen.findByText('100%')).toBeInTheDocument()

    // 9. Earn XP, coins and seeds.
    expect(screen.getByText('Scripture learned')).toBeInTheDocument()
    const afterLearning = useGameStore.getState().resources!
    expect(afterLearning.xp).toBeGreaterThan(0)
    expect(afterLearning.coins).toBeGreaterThan(startCoins)
    expect(afterLearning.seeds).toBeGreaterThan(5)

    // 10. See scripture progress update.
    expect(screen.getByText('Next review:')).toHaveTextContent('Tomorrow')
    expect(useGameStore.getState().scriptureProgress[VERSE_ID]).toMatchObject({ status: 'strong', masteryScore: 50 })

    // 12–13. Spend the earnings on the garden and see it change.
    await user.click(screen.getByRole('link', { name: 'Return to Garden' }))
    await user.click(await screen.findByRole('link', { name: /garden shop/i }))
    const bench = (await screen.findByRole('heading', { name: 'Garden Bench' })).closest('li')!
    await user.click(within(bench).getByRole('button', { name: 'Buy' }))
    await user.click(await within(bench).findByRole('button', { name: 'Place' }))
    await user.click(await screen.findByRole('button', { name: 'Place at row 7, column 1' }))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => expect(useGardenStore.getState().items).toHaveLength(startItems + 1))
    expect(screen.getByRole('button', { name: 'Garden Bench' })).toBeInTheDocument()
    const coinsAfterBuilding = useGameStore.getState().resources!.coins

    // 14. Close the game.
    cleanup()
    forgetEverythingInMemory()
    await closeDatabase()

    // 15 + 11. Return the next day and continue: the review is waiting.
    vi.setSystemTime(new Date('2026-11-28T08:30:00'))
    const router2 = openApp('/')
    await screen.findByRole('heading', { name: "Grace's Garden" })
    expect(router2.state.location.pathname).toBe('/garden')
    expect(screen.getByRole('button', { name: 'Garden Bench' })).toBeInTheDocument()
    expect(useGameStore.getState().resources!.coins).toBe(coinsAfterBuilding)
    expect(screen.getByText(/verse is ready for review/)).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /continue learning/i }))
    await waitFor(() => expect(router2.state.location.pathname).toBe(`/games/recall/${VERSE_ID}`))
    await user.type(await screen.findByLabelText('Type the verse'), verse.text)
    await user.click(screen.getByRole('button', { name: 'Check my recall' }))
    expect(await screen.findByText('Successful review')).toBeInTheDocument()
    expect(useGameStore.getState().scriptureProgress[VERSE_ID]).toMatchObject({ reviewsCompleted: 1, masteryScore: 75 })
    expect(screen.getByText('Next review:')).toHaveTextContent('In 3 days')
  })
})

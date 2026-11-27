import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider } from 'react-router-dom'
import { AppProviders } from '../app/providers'
import { createTestRouter } from '../app/router'
import { useGameStore } from '../store/gameStore'
import { DEFAULT_SETTINGS, useSettingsStore } from '../store/settingsStore'
import { loadGameSession } from '../services/persistence/saveService'

async function renderAsPlayer(path: string) {
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
  useGameStore.setState({ status: 'loading', profile: null, resources: null, scriptureProgress: {}, lastGame: null })
  await useGameStore.getState().createGuestPlayer({ displayName: 'Grace', preferredTranslation: 'KJV', dailyGoal: 3 })
  const router = createTestRouter(path)
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return router
}

describe('game flow', () => {
  beforeEach(() => useGameStore.setState({ profile: null }))

  it('Learn opens game selection with Missing Words recommended for a new verse', async () => {
    const user = userEvent.setup()
    const router = await renderAsPlayer('/scriptures/psalm-23-1-kjv')
    await user.click(await screen.findByRole('link', { name: 'Learn this scripture' }))
    expect(router.state.location.pathname).toBe('/scriptures/psalm-23-1-kjv/games')
    const recommended = screen.getByText('Recommended').closest('a')!
    expect(recommended).toHaveTextContent('Missing Words')
    await user.click(recommended)
    expect(router.state.location.pathname).toBe('/games/missing-words/psalm-23-1-kjv')
  })

  it('Missing Words: wrong tiles are rejected, hints help, and the result is saved', async () => {
    const user = userEvent.setup()
    const router = await renderAsPlayer('/games/missing-words/psalm-23-1-kjv')
    const choices = await screen.findByRole('group', { name: 'Word choices' })
    const verseWords = new Set('the lord is my shepherd i shall not want'.split(' '))

    // A distractor (a word not in the verse) is never accepted.
    const distractor = within(choices)
      .getAllByRole('button')
      .find((b) => !verseWords.has(b.textContent!.toLowerCase()))!
    await user.click(distractor)
    expect(screen.getByRole('status')).toHaveTextContent('Not quite')

    // Use hints to fill both blanks.
    for (let i = 0; i < 2; i++) {
      await user.click(screen.getByRole('button', { name: /hint/i }))
      await user.click(within(choices).getAllByRole('button').find((b) => b.className.includes('animate-glow'))!)
    }
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    expect(router.state.location.pathname).toBe('/game-complete')
    expect(await screen.findByText('0%')).toBeInTheDocument()
    expect(screen.getByText(/0 of 2 right first time · 2 hints/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /continue: word order/i })).toBeInTheDocument()

    const session = useGameStore.getState().lastGame!.session
    expect(await loadGameSession(session.id)).toMatchObject({ gameType: 'missing-words', scriptureId: 'psalm-23-1-kjv', score: 0 })
  })

  it('Word Order: tiles move by tap, the full line is checked, and hints can finish it', async () => {
    const user = userEvent.setup()
    const router = await renderAsPlayer('/games/word-order/1-thessalonians-5-16-kjv') // "Rejoice evermore."
    const pool = await screen.findByRole('region', { name: 'Word tiles' })
    // Starting order is always shuffled, so tapping in pool order gives the wrong order.
    await user.click(within(pool).getByRole('button', { name: 'evermore.' }))
    await user.click(within(pool).getByRole('button', { name: 'Rejoice' }))
    expect(screen.getByRole('status')).toHaveTextContent('out of place')

    // Tap a placed tile to send it back, then undo that.
    await user.click(screen.getByRole('button', { name: /evermore\., position 1/ }))
    expect(within(screen.getByRole('region', { name: 'Word tiles' })).getByRole('button', { name: 'evermore.' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /undo/i }))

    await user.click(screen.getByRole('button', { name: 'Move the red words back' }))
    await user.click(within(screen.getByRole('region', { name: 'Word tiles' })).getByRole('button', { name: 'Rejoice' }))
    await user.click(within(screen.getByRole('region', { name: 'Word tiles' })).getByRole('button', { name: 'evermore.' }))
    expect(screen.getByRole('status')).toHaveTextContent('Perfect order')
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    expect(router.state.location.pathname).toBe('/game-complete')
    // Both tiles were wrong at the first check.
    expect(await screen.findByText(/0 of 2 right first time/)).toBeInTheDocument()
  })

  it('Verse Recall: exact recall scores 100% and the verse is shown afterwards', async () => {
    const user = userEvent.setup()
    await renderAsPlayer('/games/recall/psalm-23-1-kjv')
    expect(screen.queryByText(/I shall not want/)).not.toBeInTheDocument() // verse hidden
    await user.type(await screen.findByLabelText('Type the verse'), 'the lord is my shepherd i shall not want')
    await user.click(screen.getByRole('button', { name: 'Check my recall' }))
    expect(await screen.findByText('100%')).toBeInTheDocument()
    expect(screen.getByText('9 of 9 words correct')).toBeInTheDocument()
    expect(screen.getByText('The LORD is my shepherd; I shall not want.')).toBeInTheDocument()
    // Recall was played first, so the learning sequence continues with Missing Words.
    expect(screen.getByRole('link', { name: /continue: missing words/i })).toBeInTheDocument()
    expect(screen.getByText('+25 mastery')).toBeInTheDocument()
    expect(screen.getByText('Tomorrow')).toBeInTheDocument()
  })

  it('Verse Recall: shows missing and wrong words', async () => {
    const user = userEvent.setup()
    await renderAsPlayer('/games/recall/psalm-23-1-kjv')
    await user.type(await screen.findByLabelText('Type the verse'), 'The Lord is my keeper I shall want')
    await user.click(screen.getByRole('button', { name: 'Check my recall' }))
    expect(await screen.findByText('78%')).toBeInTheDocument() // 7 of 9
    expect(screen.getByLabelText('missed not')).toBeInTheDocument()
    expect(screen.getByLabelText('you wrote keeper')).toBeInTheDocument()
    expect(screen.getByLabelText('should be shepherd;')).toBeInTheDocument()
  })

  it('completion screen without a finished game returns to the garden', async () => {
    const router = await renderAsPlayer('/game-complete')
    await screen.findByRole('heading', { name: /welcome back/i })
    expect(router.state.location.pathname).toBe('/garden')
  })
})

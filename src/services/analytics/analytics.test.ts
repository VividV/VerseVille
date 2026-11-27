import { describe, expect, it } from 'vitest'
import { MAX_EVENTS, getEvents, track } from './analytics'

describe('analytics (device only)', () => {
  it('records events with only the given properties', async () => {
    await track('game_completed', { gameType: 'recall', accuracy: 0.9 }, new Date('2026-11-27T10:00:00'))
    const [event] = await getEvents()
    expect(event).toMatchObject({ name: 'game_completed', props: { gameType: 'recall', accuracy: 0.9 } })
  })

  it('keeps only the most recent events', async () => {
    const start = new Date('2026-01-01T00:00:00').getTime()
    for (let i = 0; i < MAX_EVENTS + 5; i++) await track('game_started', { i }, new Date(start + i * 1000))
    const events = await getEvents()
    expect(events).toHaveLength(MAX_EVENTS)
    expect(events[0].props.i).toBe(5)
  })
})

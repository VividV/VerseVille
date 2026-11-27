import { describe, expect, it } from 'vitest'
import { applyGameResult, createProgress } from '../memorisation/learningEngine'
import { createStartingGarden } from '../garden/startingGarden'
import type { RewardTransaction } from '../../types/rewards'
import type { PlayerScripture } from '../../types/scripture'
import { balanceFromLedger, mergeScriptureProgress, mergeSnapshots, reconcileGarden, type ProgressSnapshot } from './merge'

const tx = (id: string, changes: Partial<RewardTransaction> = {}): RewardTransaction => ({
  id,
  sourceType: 'game',
  sourceId: 'x',
  sessionId: null,
  coinsDelta: 5,
  seedsDelta: 0,
  gemsDelta: 0,
  xpDelta: 5,
  label: '',
  createdAt: '2026-11-27T10:00:00.000Z',
  ...changes,
})

const empty = (): ProgressSnapshot => ({ profile: null, settings: null, progress: {}, sessions: [], transactions: [], garden: null, quests: [], days: {} })
const garden = () => ({ items: createStartingGarden(new Date('2026-11-01')), inventory: {}, meta: { expansionsUnlocked: 0, updatedAt: '2026-11-01T00:00:00.000Z' } })

describe('balanceFromLedger', () => {
  it('is starting resources plus every transaction, with the level from XP', () => {
    const r = balanceFromLedger([tx('a', { coinsDelta: 10, xpDelta: 160 }), tx('b', { coinsDelta: -30, seedsDelta: -1, xpDelta: 0 })], 'now')
    expect(r).toMatchObject({ coins: 80, seeds: 4, xp: 160, level: 2 })
  })
})

describe('mergeSnapshots (spec §15)', () => {
  it('combines transactions from both devices without duplicates, and recalculates the balance', () => {
    const local = { ...empty(), transactions: [tx('game:a'), tx('game:shared')] }
    const cloud = { ...empty(), transactions: [tx('game:shared'), tx('game:b', { coinsDelta: 15 })] }
    const merged = mergeSnapshots(local, cloud)
    expect(merged.transactions.map((t) => t.id)).toEqual(['game:a', 'game:b', 'game:shared'])
    expect(balanceFromLedger(merged.transactions, 'x').coins).toBe(100 + 5 + 15 + 5)
  })

  it('gives the same result whichever device goes first', () => {
    const a = { ...empty(), transactions: [tx('1'), tx('2')], profile: { id: 'p', displayName: 'A', createdAt: 'x', updatedAt: '2026-11-02' } }
    const b = { ...empty(), transactions: [tx('3')], profile: { id: 'p', displayName: 'B', createdAt: 'x', updatedAt: '2026-11-03' } }
    expect(mergeSnapshots(a, b).transactions).toEqual(mergeSnapshots(b, a).transactions)
    expect(mergeSnapshots(a, b).profile?.displayName).toBe('B')
    expect(mergeSnapshots(b, a).profile?.displayName).toBe('B')
  })

  it('never silently loses a mastered scripture', () => {
    const base = createProgress('psalm-23-1-kjv', new Date('2026-11-01'))
    const mastered: PlayerScripture = {
      ...base,
      status: 'mastered',
      masteryScore: 100,
      masteredAt: '2026-11-10T00:00:00.000Z',
      successfulRecallDays: ['2026-11-01', '2026-11-05', '2026-11-10'],
      updatedAt: '2026-11-10T00:00:00.000Z',
    }
    // Another device later failed a recall (score dropped) but never had the mastery record.
    const laterDevice: PlayerScripture = { ...base, status: 'strong', masteryScore: 70, successfulRecallDays: ['2026-11-12'], updatedAt: '2026-11-12T00:00:00.000Z' }
    const merged = mergeScriptureProgress(mastered, laterDevice)
    expect(merged.masteredAt).toBe('2026-11-10T00:00:00.000Z')
    expect(merged.successfulRecallDays).toHaveLength(4)
    expect(merged.masteryScore).toBe(70) // the latest score
    expect(merged.status).toBe('strong') // shown as "needs a review" in the collection, but kept
  })

  it('takes the latest schedule but the highest counts', () => {
    const a = applyGameResult(undefined, { scriptureId: 's', gameType: 'recall', accuracy: 1, completedAt: new Date('2026-11-01T10:00:00') }).progress
    const b = applyGameResult(a, { scriptureId: 's', gameType: 'recall', accuracy: 1, completedAt: new Date('2026-11-02T10:00:00') }).progress
    const merged = mergeScriptureProgress({ ...a, totalAttempts: 9 }, b)
    expect(merged.nextReviewAt).toBe(b.nextReviewAt)
    expect(merged.totalAttempts).toBe(9)
    expect(merged.completedGameTypes).toEqual(['recall'])
  })

  it('marks a quest claimed only when its reward transaction exists', () => {
    const quest = { id: '2026-11-27:recall_challenge', questId: 'recall_challenge', questDate: '2026-11-27', progress: 1, target: 1, completedAt: 'x', rewardClaimed: true }
    expect(mergeSnapshots({ ...empty(), quests: [quest] }, empty()).quests[0].rewardClaimed).toBe(false)
    const withTx = { ...empty(), quests: [quest], transactions: [tx('quest:2026-11-27:recall_challenge', { sourceType: 'quest' })] }
    expect(mergeSnapshots(withTx, empty()).quests[0].rewardClaimed).toBe(true)
  })

  it('combines daily activity and quest progress', () => {
    const local = { ...empty(), days: { d: { date: 'd', studiedScriptureIds: ['a'], goalCompletedAt: null } } }
    const cloud = { ...empty(), days: { d: { date: 'd', studiedScriptureIds: ['b'], goalCompletedAt: '2026-11-27T12:00:00Z' } } }
    expect(mergeSnapshots(local, cloud).days.d).toEqual({ date: 'd', studiedScriptureIds: ['a', 'b'], goalCompletedAt: '2026-11-27T12:00:00Z' })
  })

  it('uses the most recently changed garden layout', () => {
    const older = garden()
    const newer = { ...garden(), meta: { expansionsUnlocked: 0, updatedAt: '2026-11-20T00:00:00.000Z' } }
    newer.items = newer.items.map((i) => (i.id === 'start-tree' ? { ...i, gridX: 0 } : i))
    expect(mergeSnapshots({ ...empty(), garden: older }, { ...empty(), garden: newer }).garden?.items.find((i) => i.id === 'start-tree')?.gridX).toBe(0)
  })
})

describe('reconcileGarden', () => {
  it('adds bought items missing from an older layout to the inventory', () => {
    const r = reconcileGarden(garden(), [tx('purchase:1', { sourceType: 'purchase', sourceId: 'bench', coinsDelta: -30 })])
    expect(r.inventory).toEqual({ bench: 1 })
  })

  it('removes items that were never bought', () => {
    const g = garden()
    g.inventory = { bench: 2 }
    g.items.push({ id: 'x', itemId: 'lantern', gridX: 0, gridY: 6, rotation: 0, placedAt: '2026-11-02' })
    const r = reconcileGarden(g, [tx('purchase:1', { sourceType: 'purchase', sourceId: 'bench' })])
    expect(r.inventory).toEqual({ bench: 1 })
    expect(r.items.some((i) => i.itemId === 'lantern')).toBe(false)
    expect(r.items).toHaveLength(6) // starting garden kept
  })

  it('moves items on land that is not unlocked into the inventory, and counts land from the ledger', () => {
    const g = garden()
    g.items.push({ id: 'x', itemId: 'bench', gridX: 0, gridY: 8, rotation: 0, placedAt: '2026-11-02' })
    g.meta.expansionsUnlocked = 1
    const r = reconcileGarden(g, [tx('purchase:1', { sourceType: 'purchase', sourceId: 'bench' })])
    expect(r.meta.expansionsUnlocked).toBe(0)
    expect(r.inventory).toEqual({ bench: 1 })
  })
})

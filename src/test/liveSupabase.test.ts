// @vitest-environment node
/**
 * LIVE test against the real Supabase project (skipped unless LIVE_SUPABASE=1):
 *   LIVE_SUPABASE=1 NODE_USE_ENV_PROXY=1 npx vitest run src/test/liveSupabase.test.ts
 * Needs supabase/schema.sql applied and "Confirm email" switched off. Creates a
 * throw-away test user (its progress is wiped at the end; delete the login in
 * Authentication → Users if you like).
 */
import { afterAll, describe, expect, it } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { setSupabaseForTests } from '../services/auth/supabaseClient'
import { closeDatabase } from '../services/persistence/localDatabase'
import { useAccountStore } from '../store/accountStore'
import { useGameStore } from '../store/gameStore'
import { useGardenStore } from '../store/gardenStore'
import { useQuestStore } from '../store/questStore'
import { DEFAULT_SETTINGS, useSettingsStore } from '../store/settingsStore'
import { createGameSession } from '../engine/games/gameSession'
import { balanceFromLedger } from '../engine/sync/merge'
import type { GameType } from '../types/games'

const LIVE = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.LIVE_SUPABASE === '1'
const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const email = `verseville-test-${Date.now()}@example.com`
const password = 'test-password-123'

function newClient(): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** Simulates a different phone: empty IndexedDB, empty memory, its own Supabase session. */
async function newDevice(): Promise<SupabaseClient> {
  await closeDatabase()
  globalThis.indexedDB = new IDBFactory()
  useGameStore.setState({ status: 'ready', profile: null, resources: null, scriptureProgress: {}, rewardTransactions: [], lastGame: null })
  useGardenStore.setState({ items: [], inventory: {}, expansionsUnlocked: 0 })
  useQuestStore.setState({ quests: [], days: {} })
  useSettingsStore.setState({ settings: DEFAULT_SETTINGS })
  useAccountStore.setState({ user: null, syncStatus: 'idle', lastSyncedAt: null, lastError: null, lastRejected: 0 })
  const sb = newClient()
  setSupabaseForTests(sb)
  return sb
}

async function play(scriptureId: string, gameType: GameType, accuracy = 1) {
  const now = new Date()
  return useGameStore.getState().completeGame(
    createGameSession({
      scriptureId,
      gameType,
      accuracy,
      details: { kind: 'assisted', totalItems: 1, correctFirstTry: 1, hintsUsed: 0, mistakes: 0 },
      startedAt: now,
      now,
    }),
  )
}

async function cloudResources(sb: SupabaseClient) {
  const { data, error } = await sb.from('player_resources').select('coins, seeds, xp, level').single()
  if (error) throw error
  return data
}

let deviceA: SupabaseClient

describe.skipIf(!LIVE)('live Supabase sync', () => {
  afterAll(async () => {
    if (deviceA) await deviceA.rpc('reset_my_progress')
  })

  it('uploads guest progress, syncs a second device both ways, and refuses cheating', { timeout: 120_000 }, async () => {
    // ---- Device A: play as a guest ----
    deviceA = await newDevice()
    await useGameStore.getState().createGuestPlayer({ displayName: 'Live Test', preferredTranslation: 'KJV', dailyGoal: 1 })
    await play('psalm-23-1-kjv', 'missing-words')
    await play('psalm-23-1-kjv', 'word-order')
    await play('psalm-23-1-kjv', 'recall')
    await useGardenStore.getState().buyItem('bench')
    await useGardenStore.getState().placeItem('bench', 0, 6)
    const quest = useQuestStore.getState().quests.find((q) => q.completedAt && !q.rewardClaimed)!
    await useQuestStore.getState().claimQuest(quest.id)
    const guestResources = useGameStore.getState().resources!

    // ---- Create the account: guest progress uploads ----
    expect(await useAccountStore.getState().signUp(email, password)).toBe('signed-in')
    expect(useAccountStore.getState().lastError).toBeNull()
    expect(useAccountStore.getState().lastRejected).toBe(0)
    expect(await cloudResources(deviceA)).toMatchObject({ coins: guestResources.coins, seeds: guestResources.seeds, xp: guestResources.xp })
    const { count: gardenRows } = await deviceA.from('garden_items').select('*', { count: 'exact', head: true })
    expect(gardenRows).toBe(7)

    // ---- Device B: sign in on a fresh phone ----
    const deviceB = await newDevice()
    await useAccountStore.getState().signIn(email, password)
    expect(useGameStore.getState().profile?.displayName).toBe('Live Test')
    expect(useGameStore.getState().resources).toMatchObject({ coins: guestResources.coins, xp: guestResources.xp })
    expect(useGardenStore.getState().items.some((i) => i.itemId === 'bench' && i.gridY === 6)).toBe(true)
    expect(useGameStore.getState().scriptureProgress['psalm-23-1-kjv'].learnedAt).not.toBeNull()

    // Device B plays another verse and syncs.
    await play('john-3-16-kjv', 'missing-words')
    expect(await useAccountStore.getState().syncNow()).toBe(true)
    const afterB = useGameStore.getState().resources!
    expect(await cloudResources(deviceB)).toMatchObject({ coins: afterB.coins, xp: afterB.xp })

    // ---- Cheating is refused by the server ----
    const fake = await deviceB.rpc('submit_transactions', {
      p_transactions: [
        { id: 'game:john-3-16-kjv:recall:2026-11-27', source_type: 'game', source_id: 'john-3-16-kjv', coins_delta: 9999, xp_delta: 0, created_at: new Date().toISOString(), session_id: crypto.randomUUID() },
        { id: 'purchase:cheat', source_type: 'purchase', source_id: 'small_cottage', coins_delta: -100, created_at: new Date().toISOString() },
        { id: 'scripture-mastered:john-3-16-kjv', source_type: 'scripture-mastered', source_id: 'john-3-16-kjv', coins_delta: 15, seeds_delta: 1, xp_delta: 25, created_at: new Date().toISOString() },
      ],
    })
    expect(fake.error).toBeNull()
    expect(fake.data.rejected.map((r: { id: string }) => r.id).sort()).toEqual([
      'game:john-3-16-kjv:recall:2026-11-27',
      'purchase:cheat',
      'scripture-mastered:john-3-16-kjv',
    ])
    const direct = await deviceB.from('player_resources').update({ coins: 999999 }).eq('player_id', useAccountStore.getState().user!.id).select()
    expect(direct.data ?? []).toHaveLength(0) // Row Level Security: no rows can be updated
    const overlap = await deviceB.rpc('replace_garden', {
      p_items: [
        { id: 'a', item_id: 'bench', grid_x: 0, grid_y: 6, placed_at: new Date().toISOString() },
        { id: 'b', item_id: 'bench', grid_x: 0, grid_y: 6, placed_at: new Date().toISOString() },
      ],
      p_inventory: [],
      p_updated_at: new Date().toISOString(),
    })
    expect(overlap.error?.message).toMatch(/overlap|more bench than owned/)
    expect(await cloudResources(deviceB)).toMatchObject({ coins: afterB.coins })

    // ---- Back on device A: it picks up device B's progress ----
    await newDevice()
    setSupabaseForTests(deviceA)
    await useAccountStore.getState().signIn(email, password)
    expect(useGameStore.getState().scriptureProgress['john-3-16-kjv']).toBeDefined()
    const ledgerBalance = balanceFromLedger(useGameStore.getState().rewardTransactions, 'x')
    expect(useGameStore.getState().resources).toMatchObject({ coins: ledgerBalance.coins, xp: ledgerBalance.xp })
    expect(await cloudResources(deviceA)).toMatchObject({ coins: ledgerBalance.coins, xp: ledgerBalance.xp, level: ledgerBalance.level })
  })
})

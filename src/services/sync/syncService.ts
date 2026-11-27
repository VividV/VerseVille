/**
 * Cloud synchronisation with Supabase (spec §15).
 *
 *   1. Download the player's cloud copy.
 *   2. Merge it with this device's copy (src/engine/sync/merge.ts) and save the
 *      result on the device.            ← done while game saves are paused (lock)
 *   3. Upload whatever the cloud doesn't have yet. The server re-checks every
 *      reward and purchase; anything it rejects is removed from the device too,
 *      so both copies always agree.
 *
 * The device stays the main copy, so the game works offline; sync just catches
 * up whenever it can. Every step is safe to repeat.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { balanceFromLedger, mergeSnapshots, reconcileGarden, type GardenSnapshot, type ProgressSnapshot } from '../../engine/sync/merge'
import { loadLocalSnapshot, writeLocalSnapshot } from '../persistence/saveService'
import { exclusive } from './lock'
import * as map from './cloudMapping'

type Row = Record<string, unknown>
const PAGE = 1000
const CHUNK = 500

async function fetchAll(sb: SupabaseClient, table: string): Promise<Row[]> {
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb.from(table).select('*').range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data as Row[]))
    if (!data || data.length < PAGE) return rows
  }
}

export async function fetchCloudSnapshot(sb: SupabaseClient): Promise<ProgressSnapshot> {
  const [profiles, settings, progress, sessions, transactions, items, inventory, gardenState, quests, days] = await Promise.all(
    ['profiles', 'player_settings', 'player_scriptures', 'game_sessions', 'reward_transactions', 'garden_items', 'inventory', 'garden_state', 'daily_quests', 'daily_activity'].map(
      (t) => fetchAll(sb, t),
    ),
  )
  const state = gardenState[0]
  const hasGarden = state !== undefined && new Date(state.updated_at as string).getTime() > 0
  return {
    profile: profiles[0] ? map.rowToProfile(profiles[0]) : null,
    settings: settings[0] ? map.rowToSettings(settings[0]) : null,
    progress: Object.fromEntries(progress.map((r) => { const p = map.rowToProgress(r); return [p.scriptureId, p] })),
    sessions: sessions.map(map.rowToSession),
    transactions: transactions.map(map.rowToTransaction),
    garden: hasGarden
      ? {
          items: items.map(map.rowToGardenItem),
          inventory: Object.fromEntries(inventory.map((r) => [r.item_id as string, r.quantity as number])),
          meta: { expansionsUnlocked: state.expansions_unlocked as number, updatedAt: map.iso(state.updated_at) },
        }
      : null,
    quests: quests.map(map.rowToQuest),
    days: Object.fromEntries(days.map((r) => { const d = map.rowToDay(r); return [d.date, d] })),
  }
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

async function upsertChanged<T>(
  sb: SupabaseClient,
  table: string,
  merged: T[],
  cloud: Map<string, T>,
  key: (t: T) => string,
  toRow: (t: T) => Row,
  onConflict: string,
): Promise<void> {
  const changed = merged.filter((t) => !same(cloud.get(key(t)), t)).map(toRow)
  for (let i = 0; i < changed.length; i += CHUNK) {
    const { error } = await sb.from(table).upsert(changed.slice(i, i + CHUNK), { onConflict })
    if (error) throw new Error(`${table}: ${error.message}`)
  }
}

function canonicalGarden(g: GardenSnapshot | null) {
  if (!g) return null
  return {
    items: [...g.items].sort((a, b) => a.id.localeCompare(b.id)),
    inventory: Object.fromEntries(Object.entries(g.inventory).filter(([, q]) => q > 0).sort()),
  }
}

export interface PushResult {
  rejected: { id: string; reason: string }[]
}

/** Uploads what the cloud is missing. Order matters: the server checks rewards against the rows before them. */
export async function pushSnapshot(sb: SupabaseClient, uid: string, merged: ProgressSnapshot, cloud: ProgressSnapshot): Promise<PushResult> {
  if (merged.profile && !same(merged.profile, cloud.profile)) {
    const { error } = await sb.from('profiles').upsert(map.profileToRow(merged.profile, merged.settings, uid), { onConflict: 'id' })
    if (error) throw new Error(`profiles: ${error.message}`)
  }
  if (merged.settings && !same(merged.settings, cloud.settings)) {
    const { error } = await sb.from('player_settings').upsert(map.settingsToRow(merged.settings, uid), { onConflict: 'player_id' })
    if (error) throw new Error(`player_settings: ${error.message}`)
  }
  await upsertChanged(sb, 'player_scriptures', Object.values(merged.progress), new Map(Object.entries(cloud.progress)), (p) => p.scriptureId, (p) => map.progressToRow(p, uid), 'player_id,scripture_id')

  const cloudSessions = new Set(cloud.sessions.map((s) => s.id))
  const newSessions = merged.sessions.filter((s) => !cloudSessions.has(s.id)).map((s) => map.sessionToRow(s, uid))
  for (let i = 0; i < newSessions.length; i += CHUNK) {
    const { error } = await sb.from('game_sessions').upsert(newSessions.slice(i, i + CHUNK), { onConflict: 'id', ignoreDuplicates: true })
    if (error) throw new Error(`game_sessions: ${error.message}`)
  }
  await upsertChanged(sb, 'daily_quests', merged.quests, new Map(cloud.quests.map((q) => [q.id, q])), (q) => q.id, (q) => map.questToRow(q, uid), 'player_id,quest_id,quest_date')
  await upsertChanged(sb, 'daily_activity', Object.values(merged.days), new Map(Object.entries(cloud.days)), (d) => d.date, (d) => map.dayToRow(d, uid), 'player_id,activity_date')

  const cloudTx = new Set(cloud.transactions.map((t) => t.id))
  const newTx = merged.transactions.filter((t) => !cloudTx.has(t.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const rejected: PushResult['rejected'] = []
  for (let i = 0; i < newTx.length; i += CHUNK) {
    const { data, error } = await sb.rpc('submit_transactions', { p_transactions: newTx.slice(i, i + CHUNK).map(map.transactionToRow) })
    if (error) throw new Error(`reward transactions: ${error.message}`)
    rejected.push(...((data as { rejected: PushResult['rejected'] }).rejected ?? []))
  }
  return { rejected }
}

export async function pushGarden(sb: SupabaseClient, garden: GardenSnapshot | null, cloud: GardenSnapshot | null): Promise<void> {
  if (!garden || same(canonicalGarden(garden), canonicalGarden(cloud))) return
  const { error } = await sb.rpc('replace_garden', {
    p_items: garden.items.map(map.gardenItemToRow),
    p_inventory: Object.entries(garden.inventory).map(([item_id, quantity]) => ({ item_id, quantity })),
    p_updated_at: garden.meta.updatedAt ?? new Date().toISOString(),
  })
  if (error) throw new Error(`garden: ${error.message}`)
}

/** Removes transactions the server refused, and fixes everything that depended on them. */
export function dropRejected(snapshot: ProgressSnapshot, rejectedIds: Set<string>): ProgressSnapshot {
  const transactions = snapshot.transactions.filter((t) => !rejectedIds.has(t.id))
  const claimed = new Set(transactions.filter((t) => t.sourceType === 'quest').map((t) => t.id.slice('quest:'.length)))
  return {
    ...snapshot,
    transactions,
    quests: snapshot.quests.map((q) => ({ ...q, rewardClaimed: claimed.has(q.id) })),
    garden: snapshot.garden ? reconcileGarden(snapshot.garden, transactions) : null,
  }
}

export interface SyncOutcome {
  /** True if this device's data changed because of the cloud. */
  changedLocally: boolean
  rejected: { id: string; reason: string }[]
  hasProfile: boolean
}

/**
 * One full sync. `afterLocalWrite` lets the app reload its in-memory state
 * from the device (it runs inside the lock, so no game save can interleave).
 */
export async function syncWithCloud(
  sb: SupabaseClient,
  uid: string,
  afterLocalWrite: () => Promise<void>,
): Promise<SyncOutcome> {
  const cloud = await fetchCloudSnapshot(sb)

  let merged!: ProgressSnapshot
  let changedLocally = false
  await exclusive(async () => {
    const local = await loadLocalSnapshot()
    merged = mergeSnapshots(local, cloud)
    changedLocally = !same(merged, local)
    if (changedLocally) {
      await writeLocalSnapshot(merged, balanceFromLedger(merged.transactions, new Date().toISOString()))
      await afterLocalWrite()
    }
  })

  const { rejected } = await pushSnapshot(sb, uid, merged, cloud)
  if (rejected.length > 0) {
    const ids = new Set(rejected.map((r) => r.id))
    await exclusive(async () => {
      // Re-read: a game may have finished meanwhile.
      const fixed = dropRejected(mergeSnapshots(await loadLocalSnapshot(), merged), ids)
      merged = fixed
      await writeLocalSnapshot(fixed, balanceFromLedger(fixed.transactions, new Date().toISOString()))
      await afterLocalWrite()
    })
    changedLocally = true
  }
  await pushGarden(sb, merged.garden, cloud.garden)
  return { changedLocally, rejected, hasProfile: merged.profile !== null }
}

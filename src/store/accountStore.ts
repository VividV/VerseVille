/**
 * Optional account and cloud sync (spec §15). Guest play never needs this.
 *
 * Once signed in, VerseVille syncs: at start-up, a couple of seconds after any
 * change, when the connection comes back, and when the player taps "Sync now".
 */
import { create } from 'zustand'
import { currentUser, signIn as authSignIn, signOut as authSignOut, signUp as authSignUp, type AccountUser } from '../services/auth/authService'
import { getSupabase, isCloudConfigured } from '../services/auth/supabaseClient'
import { syncWithCloud } from '../services/sync/syncService'
import { loadAccount, saveAccount } from '../services/persistence/saveService'
import { useGameStore } from './gameStore'
import { useGardenStore } from './gardenStore'
import { useQuestStore } from './questStore'
import { useSettingsStore } from './settingsStore'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

interface AccountState {
  configured: boolean
  user: AccountUser | null
  syncStatus: SyncStatus
  lastSyncedAt: string | null
  lastError: string | null
  /** Rewards or purchases the server refused in the last sync (removed from this device). */
  lastRejected: number

  init: () => Promise<void>
  signUp: (email: string, password: string) => Promise<'signed-in' | 'confirm-email'>
  signIn: (email: string, password: string) => Promise<void>
  /** Uploads first; if that fails and `force` is false, it throws so the player can decide. */
  signOut: (force?: boolean) => Promise<void>
  syncNow: () => Promise<boolean>
  /** Deletes all progress in the account and on this device (Profile → Reset progress). */
  resetEverything: () => Promise<void>
}

export class UnsyncedChangesError extends Error {
  constructor() {
    super("Some progress hasn't reached your account yet (are you offline?).")
    this.name = 'UnsyncedChangesError'
  }
}

let timer: ReturnType<typeof setTimeout> | null = null
let applyingSync = false
let running: Promise<boolean> | null = null
let subscribed = false
const SYNC_DELAY_MS = 2000

function isOfflineError(message: string) {
  return /fetch|network|offline|load failed/i.test(message)
}

export const useAccountStore = create<AccountState>()((set, get) => {
  const scheduleSync = () => {
    if (applyingSync || !get().user) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void get().syncNow(), SYNC_DELAY_MS)
  }

  const subscribe = () => {
    if (subscribed) return
    subscribed = true
    useGameStore.subscribe((s, prev) => {
      if (s.profile !== prev.profile || s.resources !== prev.resources || s.scriptureProgress !== prev.scriptureProgress) scheduleSync()
    })
    useGardenStore.subscribe((s, prev) => {
      if (s.updatedAt !== prev.updatedAt) scheduleSync()
    })
    useQuestStore.subscribe((s, prev) => {
      if (s.quests !== prev.quests || s.days !== prev.days) scheduleSync()
    })
    useSettingsStore.subscribe((s, prev) => {
      if (s.settings !== prev.settings) scheduleSync()
    })
    if (typeof window !== 'undefined') window.addEventListener('online', () => void get().syncNow())
  }

  const afterSignIn = async (user: AccountUser) => {
    const previous = await loadAccount()
    await saveAccount({ userId: user.id, email: user.email, lastSyncedAt: previous?.userId === user.id ? previous.lastSyncedAt : null })
    set({ user, lastError: null })
    subscribe()
    const ok = await get().syncNow()
    if (!ok) throw new Error(get().lastError ?? 'Could not sync your progress.')
  }

  return {
    configured: isCloudConfigured(),
    user: null,
    syncStatus: 'idle',
    lastSyncedAt: null,
    lastError: null,
    lastRejected: 0,

    init: async () => {
      if (!isCloudConfigured()) return
      const [user, account] = await Promise.all([currentUser(), loadAccount()])
      if (!user) return
      set({ user, lastSyncedAt: account?.lastSyncedAt ?? null })
      subscribe()
      void get().syncNow()
    },

    signUp: async (email, password) => {
      const result = await authSignUp(email, password)
      if (result.status === 'confirm-email') return 'confirm-email'
      await afterSignIn(result.user)
      return 'signed-in'
    },

    signIn: async (email, password) => {
      await afterSignIn(await authSignIn(email, password))
    },

    signOut: async (force = false) => {
      if (get().user) {
        const ok = await get().syncNow()
        if (!ok && !force) throw new UnsyncedChangesError()
      }
      if (timer) clearTimeout(timer)
      await authSignOut()
      set({ user: null, syncStatus: 'idle', lastSyncedAt: null, lastError: null, lastRejected: 0 })
      // Signing out removes this account's progress from the device (it's safe in the cloud).
      applyingSync = true
      try {
        await useGameStore.getState().resetProgress()
      } finally {
        applyingSync = false
      }
    },

    syncNow: async () => {
      const sb = getSupabase()
      const user = get().user
      if (!sb || !user) return false
      if (running) return running
      running = (async () => {
        set({ syncStatus: 'syncing', lastError: null })
        try {
          const outcome = await syncWithCloud(sb, user.id, async () => {
            applyingSync = true
            try {
              await useGameStore.getState().reloadFromDevice()
            } finally {
              applyingSync = false
            }
          })
          const lastSyncedAt = new Date().toISOString()
          await saveAccount({ userId: user.id, email: user.email, lastSyncedAt })
          set({ syncStatus: 'idle', lastSyncedAt, lastRejected: outcome.rejected.length })
          if (outcome.rejected.length) console.warn('VerseVille: the server refused some changes', outcome.rejected)
          return true
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          set({ syncStatus: isOfflineError(message) || !navigator.onLine ? 'offline' : 'error', lastError: message })
          return false
        } finally {
          running = null
        }
      })()
      return running
    },

    resetEverything: async () => {
      const sb = getSupabase()
      const user = get().user
      applyingSync = true
      try {
        if (sb && user) {
          const { error } = await sb.rpc('reset_my_progress')
          if (error) throw new Error(error.message)
        }
        await useGameStore.getState().resetProgress()
        if (user) await saveAccount({ userId: user.id, email: user.email, lastSyncedAt: null })
      } finally {
        applyingSync = false
      }
    },
  }
})

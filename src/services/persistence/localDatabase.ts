/**
 * Thin wrapper around the browser's IndexedDB.
 *
 * Every kind of saved data lives in its own "object store" (like a table).
 * Records are plain objects; each store uses an explicit key passed to `put`.
 * Later phases fill the stores that are empty today (scripture progress,
 * garden items, quests, ...). Adding a store means bumping DB_VERSION.
 */

export const DB_NAME = 'verseville'
export const DB_VERSION = 2 // v2: added the "garden" store

export const STORES = [
  'profile',
  'resources',
  'settings',
  'scriptureProgress',
  'gardenItems',
  'inventory',
  'quests',
  'gameSessions',
  'rewardTransactions',
  'garden',
] as const

export type StoreName = (typeof STORES)[number]

let dbPromise: Promise<IDBDatabase> | null = null

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Opens (and if needed creates or upgrades) the database. Reuses one connection. */
export function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name)
      }
    }
    request.onsuccess = () => {
      const db = request.result
      // If another tab upgrades the database, close so the upgrade can proceed.
      db.onversionchange = () => {
        db.close()
        dbPromise = null
      }
      resolve(db)
    }
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })
  return dbPromise
}

/** Closes the connection. Mainly used by tests to simulate reopening the browser. */
export async function closeDatabase(): Promise<void> {
  if (!dbPromise) return
  const db = await dbPromise.catch(() => null)
  db?.close()
  dbPromise = null
}

async function withStore<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  run: (objectStore: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase()
  const tx = db.transaction(store, mode)
  const result = await promisify(run(tx.objectStore(store)))
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
  })
  return result
}

export async function getRecord<T>(store: StoreName, key: string): Promise<T | undefined> {
  return (await withStore(store, 'readonly', (s) => s.get(key))) as T | undefined
}

export async function getAllRecords<T>(store: StoreName): Promise<T[]> {
  return (await withStore(store, 'readonly', (s) => s.getAll())) as T[]
}

export async function putRecord<T>(store: StoreName, key: string, value: T): Promise<void> {
  await withStore(store, 'readwrite', (s) => s.put(value, key))
}

export async function deleteRecord(store: StoreName, key: string): Promise<void> {
  await withStore(store, 'readwrite', (s) => s.delete(key))
}

export interface AtomicWrite {
  store: StoreName
  key: string
  value: unknown
  /**
   * "put" (default) creates or replaces. "add" only creates: if a record with this
   * key already exists the WHOLE transaction fails and nothing is saved.
   * "delete" removes the record (value is ignored).
   */
  mode?: 'put' | 'add' | 'delete'
}

/** Writes several records across stores in ONE transaction: all succeed or none do. */
export async function putRecordsAtomically(writes: AtomicWrite[]): Promise<void> {
  if (writes.length === 0) return
  const db = await openDatabase()
  const storeNames = [...new Set(writes.map((w) => w.store))]
  const tx = db.transaction(storeNames, 'readwrite')
  let firstError: Error | null = null
  for (const w of writes) {
    const store = tx.objectStore(w.store)
    const request =
      w.mode === 'add' ? store.add(w.value, w.key) : w.mode === 'delete' ? store.delete(w.key) : store.put(w.value, w.key)
    request.onerror = () => {
      // Remember why it failed; the error still aborts the whole transaction.
      firstError ??= request.error ?? new Error(`Could not save ${w.store}/${w.key}`)
    }
  }
  await new Promise<void>((resolve, reject) => {
    const fail = () => reject(firstError ?? tx.error ?? new Error('Saving failed'))
    tx.oncomplete = () => resolve()
    tx.onerror = fail
    tx.onabort = fail
  })
}

/** Empties every store. Used by "Reset progress". */
export async function clearAllStores(): Promise<void> {
  const db = await openDatabase()
  const tx = db.transaction([...STORES], 'readwrite')
  for (const name of STORES) tx.objectStore(name).clear()
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
  })
}

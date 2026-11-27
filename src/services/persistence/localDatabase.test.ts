import { describe, expect, it } from 'vitest'
import {
  clearAllStores,
  closeDatabase,
  deleteRecord,
  getAllRecords,
  getRecord,
  putRecord,
  putRecordsAtomically,
} from './localDatabase'

describe('localDatabase', () => {
  it('saves and reads a record', async () => {
    await putRecord('profile', 'current', { name: 'Ada' })
    expect(await getRecord('profile', 'current')).toEqual({ name: 'Ada' })
  })

  it('returns undefined for a missing record', async () => {
    expect(await getRecord('profile', 'nobody')).toBeUndefined()
  })

  it('keeps data after the database connection is closed and reopened (browser restart)', async () => {
    await putRecord('resources', 'current', { coins: 100 })
    await closeDatabase()
    expect(await getRecord('resources', 'current')).toEqual({ coins: 100 })
  })

  it('lists, deletes and clears records', async () => {
    await putRecord('inventory', 'a', { q: 1 })
    await putRecord('inventory', 'b', { q: 2 })
    expect(await getAllRecords('inventory')).toHaveLength(2)
    await deleteRecord('inventory', 'a')
    expect(await getAllRecords('inventory')).toEqual([{ q: 2 }])
    await clearAllStores()
    expect(await getAllRecords('inventory')).toEqual([])
  })

  it('writes several stores in one transaction', async () => {
    await putRecordsAtomically([
      { store: 'profile', key: 'current', value: { n: 1 } },
      { store: 'settings', key: 'current', value: { s: 1 } },
    ])
    expect(await getRecord('profile', 'current')).toEqual({ n: 1 })
    expect(await getRecord('settings', 'current')).toEqual({ s: 1 })
  })
})

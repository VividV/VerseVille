import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { closeDatabase } from '../services/persistence/localDatabase'

// Every test starts with a brand-new, empty "browser database".
beforeEach(async () => {
  await closeDatabase()
  globalThis.indexedDB = new IDBFactory()
})

afterEach(() => {
  cleanup()
})

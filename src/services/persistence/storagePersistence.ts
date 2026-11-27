/**
 * Asks the browser to keep VerseVille's saved data even when the device is low
 * on space. Without this, a browser may clear "best-effort" storage. Browsers
 * may say no (often until the app is installed); progress is still saved either way.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

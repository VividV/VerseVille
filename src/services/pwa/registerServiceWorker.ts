/**
 * Registers the service worker (public/sw.js) so VerseVille can be installed on
 * Android and opened offline. Only in production builds — during development a
 * cache would just get in the way of seeing changes.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // The app still works without offline support.
    })
  })
}

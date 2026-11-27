import { useEffect, type ReactNode } from 'react'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import { useAccountStore } from '../store/accountStore'
import { LoadingState } from '../components/common/LoadingState'
import { Button } from '../components/common/Button'

/** Mirrors accessibility settings onto <html> so CSS (index.css) can react to them. */
function AccessibilitySync() {
  const { textSize, highContrast, reducedMotion } = useSettingsStore((s) => s.settings)
  useEffect(() => {
    const root = document.documentElement
    root.dataset.textSize = textSize
    root.dataset.contrast = highContrast ? 'high' : 'normal'
    root.dataset.reducedMotion = String(reducedMotion)
  }, [textSize, highContrast, reducedMotion])
  return null
}

/** Loads saved progress before showing the app, and shows a friendly error if that fails. */
export function AppProviders({ children }: { children: ReactNode }) {
  const status = useGameStore((s) => s.status)
  const errorMessage = useGameStore((s) => s.errorMessage)
  const hydrate = useGameStore((s) => s.hydrate)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // Once progress is loaded, reconnect a signed-in account and sync in the background.
  useEffect(() => {
    if (status === 'ready') void useAccountStore.getState().init()
  }, [status])

  return (
    <>
      <AccessibilitySync />
      {status === 'loading' && <LoadingState message="Opening your garden…" />}
      {status === 'error' && (
        <div role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="text-5xl" aria-hidden="true">
            🥀
          </span>
          <h1 className="text-xl font-extrabold text-leaf-dark">We couldn't open your garden</h1>
          <p className="text-ink-soft">
            {errorMessage} Private browsing modes sometimes block saving. Please try again in a normal browser window.
          </p>
          <Button onClick={() => void hydrate()}>Try again</Button>
        </div>
      )}
      {status === 'ready' && children}
    </>
  )
}

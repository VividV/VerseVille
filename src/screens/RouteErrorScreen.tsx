import { useRouteError } from 'react-router-dom'
import { Button } from '../components/common/Button'

/**
 * Shown if a screen crashes, instead of a blank page. Progress is safe in
 * IndexedDB, so reloading is always a safe way back.
 */
export function RouteErrorScreen() {
  const error = useRouteError()
  const detail = error instanceof Error ? error.message : null
  // A new version was deployed while the app was open: reloading fetches it.
  const isStaleChunk = Boolean(detail && /dynamically imported module|Failed to fetch|Importing a module script failed/i.test(detail))

  return (
    <div role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="text-5xl" aria-hidden="true">
        🍂
      </span>
      <h1 className="text-xl font-extrabold text-leaf-dark">
        {isStaleChunk ? 'VerseVille has been updated' : 'Something went wrong'}
      </h1>
      <p className="text-ink-soft">
        {isStaleChunk
          ? 'Reload to get the newest version.'
          : "Don't worry — your progress is saved on this device. Reloading usually fixes this."}
      </p>
      <Button onClick={() => window.location.assign('/garden')}>Reload VerseVille</Button>
    </div>
  )
}

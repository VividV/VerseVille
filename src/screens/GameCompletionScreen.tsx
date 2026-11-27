import { Link, Navigate } from 'react-router-dom'
import { GameResultScreen } from '../components/games/GameResultScreen'
import { GAME_INFO, gamePath, nextInSequence } from '../engine/games/gameRules'
import { getScriptureById } from '../engine/scripture/scriptureCatalog'
import { useGameStore } from '../store/gameStore'

const linkButton = 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 font-bold transition'

export function GameCompletionScreen() {
  const session = useGameStore((s) => s.lastGameSession)
  const scripture = session ? getScriptureById(session.scriptureId) : undefined

  // Nothing to show (e.g. the page was refreshed): go home.
  if (!session || !scripture) return <Navigate to="/garden" replace />

  const next = nextInSequence(session.gameType)

  return (
    <div className="min-h-dvh bg-paper">
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <GameResultScreen session={session} scripture={scripture} />

        <nav aria-label="What next" className="flex flex-col gap-3">
          {next ? (
            <Link to={gamePath(next, scripture.id)} className={`${linkButton} bg-leaf text-white shadow-soft hover:bg-leaf-dark`}>
              Continue: {GAME_INFO[next].name} <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <Link to="/scriptures?status=new" className={`${linkButton} bg-leaf text-white shadow-soft hover:bg-leaf-dark`}>
              Learn another scripture <span aria-hidden="true">→</span>
            </Link>
          )}
          <Link to={gamePath(session.gameType, scripture.id)} className={`${linkButton} bg-cream text-leaf-dark ring-2 ring-leaf/40`}>
            Practise again
          </Link>
          <Link to="/garden" className={`${linkButton} text-leaf-dark hover:bg-leaf-light`}>
            Return to Garden
          </Link>
        </nav>
      </main>
    </div>
  )
}

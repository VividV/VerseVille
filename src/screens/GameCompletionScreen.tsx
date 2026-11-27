import { Link, Navigate } from 'react-router-dom'
import { GameResultScreen } from '../components/games/GameResultScreen'
import { LearningResult } from '../components/scripture/LearningResult'
import { GAME_INFO, gamePath } from '../engine/games/gameRules'
import { getNextActivity, nextLearningStep } from '../engine/memorisation/reviewQueue'
import { getScriptureById, getScriptures } from '../engine/scripture/scriptureCatalog'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import { nextActivityPath } from './nextActivity'

const linkButton = 'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 font-bold transition'

export function GameCompletionScreen() {
  const game = useGameStore((s) => s.lastGame)
  const progressById = useGameStore((s) => s.scriptureProgress)
  const translation = useSettingsStore((s) => s.settings.preferredTranslation)
  const scripture = game ? getScriptureById(game.session.scriptureId) : undefined

  // Nothing to show (e.g. the page was refreshed): go home. Progress was already saved.
  if (!game || !scripture) return <Navigate to="/garden" replace />

  const now = new Date()
  const { session } = game
  const nextStep = nextLearningStep(game.update.progress)
  const next = nextStep ? null : getNextActivity(getScriptures(translation), progressById, now)

  return (
    <div className="min-h-dvh bg-paper">
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <GameResultScreen session={session} scripture={scripture}>
          <LearningResult game={game} now={now} />
        </GameResultScreen>

        <nav aria-label="What next" className="flex flex-col gap-3">
          {nextStep ? (
            <Link to={gamePath(nextStep, scripture.id)} className={`${linkButton} bg-leaf text-white shadow-soft hover:bg-leaf-dark`}>
              Continue: {GAME_INFO[nextStep].name} <span aria-hidden="true">→</span>
            </Link>
          ) : next ? (
            <Link to={nextActivityPath(next)} className={`${linkButton} bg-leaf text-white shadow-soft hover:bg-leaf-dark`}>
              Continue Learning: {next.scripture.reference} <span aria-hidden="true">→</span>
            </Link>
          ) : (
            <p className="text-center font-bold text-leaf-dark">You're all caught up. Wonderful!</p>
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

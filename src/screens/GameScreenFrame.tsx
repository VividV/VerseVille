import { useEffect, useState, type ReactNode } from 'react'
import { track } from '../services/analytics/analytics'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'
import { GameHeader } from '../components/games/GameHeader'
import type { GameFinish } from '../components/games/MissingWordsGame'
import { GAME_INFO } from '../engine/games/gameRules'
import { createGameSession } from '../engine/games/gameSession'
import { getScriptureById } from '../engine/scripture/scriptureCatalog'
import { useGameStore } from '../store/gameStore'
import type { GameType } from '../types/games'
import type { Scripture } from '../types/scripture'

/**
 * Shared wrapper for the three game screens: finds the scripture, times the game,
 * saves the finished session and opens the completion screen.
 */
export function GameScreenFrame({
  gameType,
  children,
}: {
  gameType: GameType
  children: (scripture: Scripture, onFinish: (result: GameFinish) => void) => ReactNode
}) {
  const { scriptureId = '' } = useParams()
  const navigate = useNavigate()
  const completeGame = useGameStore((s) => s.completeGame)
  const [startedAt] = useState(() => new Date())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scripture = getScriptureById(scriptureId)
  const info = GAME_INFO[gameType]

  useEffect(() => {
    if (scripture) void track('game_started', { scriptureId: scripture.id, gameType })
  }, [scripture, gameType])

  if (!scripture) {
    return (
      <div className="mx-auto max-w-md p-4">
        <EmptyState
          icon="📖"
          title="Scripture not found"
          message="We couldn't find that scripture."
          action={
            <Link to="/scriptures" className="inline-flex min-h-11 items-center rounded-full bg-leaf px-5 font-bold text-white">
              Back to scriptures
            </Link>
          }
        />
      </div>
    )
  }

  const onFinish = async ({ accuracy, details }: GameFinish) => {
    if (saving) return // ignore double taps: one finished game = one session
    setSaving(true)
    setError(null)
    try {
      const session = createGameSession({ scriptureId: scripture.id, gameType, accuracy, details, startedAt })
      await completeGame(session) // progress is saved before leaving the screen
      navigate('/game-complete', { replace: true })
    } catch {
      setError('We could not save this game. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-dvh bg-paper">
      <GameHeader title={`${info.icon} ${info.name}`} reference={scripture.reference} exitTo={`/scriptures/${scripture.id}`} />
      <main className="mx-auto max-w-md px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-2">
        {children(scripture, onFinish)}
        {error && (
          <p role="alert" className="mt-3 text-center font-bold text-[#b64b3c]">
            {error}
          </p>
        )}
      </main>
    </div>
  )
}

import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'
import { MasteryBadge } from '../components/scripture/MasteryBadge'
import { GAME_INFO, LEARNING_SEQUENCE, gamePath, recommendGame } from '../engine/games/gameRules'
import { getScriptureById } from '../engine/scripture/scriptureCatalog'
import { getScriptureStatus } from '../engine/scripture/scriptureStatus'
import { useGameStore } from '../store/gameStore'

export function GameSelectionScreen() {
  const { scriptureId = '' } = useParams()
  const progress = useGameStore((s) => s.scriptureProgress[scriptureId])
  const scripture = getScriptureById(scriptureId)

  if (!scripture) {
    return <EmptyState icon="📖" title="Scripture not found" message="We couldn't find that scripture." />
  }

  const status = getScriptureStatus(progress)
  const recommended = recommendGame(status)

  return (
    <div className="flex flex-col gap-4 animate-pop-in">
      <Link to={`/scriptures/${scripture.id}`} className="-ml-1 inline-flex min-h-11 items-center gap-1 font-bold text-leaf-dark">
        <span aria-hidden="true">←</span> {scripture.reference}
      </Link>
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-leaf-dark">Choose an activity</h1>
        <MasteryBadge status={status} />
      </header>
      {status === 'new' && (
        <p className="text-ink-soft">
          New verses grow best step by step: fill in the missing words, put the words in order, then try it from memory.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {LEARNING_SEQUENCE.map((type, i) => {
          const info = GAME_INFO[type]
          const isRecommended = type === recommended
          return (
            <li key={type}>
              <Link
                to={gamePath(type, scripture.id)}
                className={[
                  'flex min-h-20 items-center gap-4 rounded-card p-4 shadow-soft transition hover:-translate-y-0.5',
                  isRecommended ? 'bg-leaf text-white' : 'bg-cream text-ink',
                ].join(' ')}
              >
                <span className="text-4xl" aria-hidden="true">
                  {info.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-extrabold">
                    {i + 1}. {info.name}
                  </span>
                  <span className={`block text-sm ${isRecommended ? 'text-white/90' : 'text-ink-soft'}`}>
                    {info.description}
                  </span>
                </span>
                {isRecommended && (
                  <span className="shrink-0 rounded-full bg-gold px-2 py-0.5 text-xs font-extrabold text-ink">Recommended</span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

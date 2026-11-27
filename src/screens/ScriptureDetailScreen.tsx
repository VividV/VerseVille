import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { EmptyState } from '../components/common/EmptyState'
import { ScriptureExplanation } from '../components/scripture/ScriptureExplanation'
import { ScriptureProgress } from '../components/scripture/ScriptureProgress'
import { ScriptureText } from '../components/scripture/ScriptureText'
import { MasteryBadge } from '../components/scripture/MasteryBadge'
import { getRelatedScriptures, getScriptureById, getTopicById } from '../engine/scripture/scriptureCatalog'
import { getScriptureStatus, isReviewDue } from '../engine/scripture/scriptureStatus'
import { useGameStore } from '../store/gameStore'

export function ScriptureDetailScreen() {
  const { scriptureId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const progressById = useGameStore((s) => s.scriptureProgress)
  const scripture = getScriptureById(scriptureId)
  const now = new Date()

  // Go back to the library (keeping its search) if we came from inside the app.
  const goBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate('/scriptures')
  }

  if (!scripture) {
    return (
      <EmptyState
        icon="📖"
        title="Scripture not found"
        message="We couldn't find that scripture in the library."
        action={
          <Link to="/scriptures" className="inline-flex min-h-11 items-center rounded-full bg-leaf px-5 font-bold text-white">
            Back to scriptures
          </Link>
        }
      />
    )
  }

  const progress = progressById[scripture.id]
  const isNew = getScriptureStatus(progress) === 'new'
  const due = isReviewDue(progress, now)
  const related = getRelatedScriptures(scripture)

  return (
    <article className="flex flex-col gap-4 animate-pop-in">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={goBack} className="-ml-2 px-3" aria-label="Back">
          <span aria-hidden="true">←</span> Back
        </Button>
      </div>

      <header>
        <h1 className="text-3xl font-extrabold text-leaf-dark">{scripture.reference}</h1>
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Topics">
          {scripture.topicIds.map((id) => {
            const topic = getTopicById(id)
            return (
              <li key={id}>
                <Link
                  to={`/scriptures?topic=${id}`}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full bg-cream px-3 text-sm font-bold text-ink-soft ring-1 ring-leaf-light hover:bg-leaf-light"
                >
                  <span aria-hidden="true">{topic?.icon}</span> {topic?.name ?? id}
                </Link>
              </li>
            )
          })}
        </ul>
      </header>

      <ScriptureText scripture={scripture} />

      <div className="flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-sm text-ink-soft ring-1 ring-leaf-light">
        <span aria-hidden="true">🔈</span>
        Audio narration is planned for a future update.
      </div>

      <ScriptureExplanation text={scripture.explanation} />

      <ScriptureProgress progress={progress} now={now} />

      <Link
        to={`/scriptures/${scripture.id}/games`}
        className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-leaf px-6 text-lg font-bold text-white shadow-soft hover:bg-leaf-dark"
      >
        {isNew ? 'Learn this scripture' : due ? 'Review now' : progress?.learnedAt ? 'Practise this scripture' : 'Continue learning'}
      </Link>

      {related.length > 0 && (
        <section aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-2 text-lg font-extrabold text-leaf-dark">
            Related scriptures
          </h2>
          <ul className="flex flex-col gap-2">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/scriptures/${r.id}`}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-2 shadow-soft hover:bg-leaf-light"
                >
                  <span className="min-w-0">
                    <span className="block font-extrabold text-leaf-dark">{r.reference}</span>
                    <span className="block truncate text-sm text-ink-soft">{r.text}</span>
                  </span>
                  <MasteryBadge status={getScriptureStatus(progressById[r.id])} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/common/EmptyState'
import { getScriptureById, getTopicById, getTopics } from '../engine/scripture/scriptureCatalog'
import { REQUIRED_RECALL_DAYS } from '../engine/memorisation/mastery'
import { useGameStore } from '../store/gameStore'
import type { Scripture } from '../types/scripture'

type LevelFilter = 'all' | 'mastered' | 'needs-review'

const CARD_GRADIENTS = [
  'from-[#DDEBD8] to-[#A8D5E5]',
  'from-[#FFF8EA] to-[#F3C4A8]',
  'from-[#FFF3CF] to-[#E8B85B]',
  'from-[#DDEBD8] to-[#8FC184]',
]

/** Spec Screen 13: cards for every scripture the player has mastered. */
export function CollectionScreen() {
  const progressById = useGameStore((s) => s.scriptureProgress)
  const [topicId, setTopicId] = useState<string | null>(null)
  const [level, setLevel] = useState<LevelFilter>('all')
  const [recentOnly, setRecentOnly] = useState(false)

  // Once mastered, a verse stays in the collection (never silently removed);
  // if its mastery later dips it shows "needs a review".
  const collected = useMemo(
    () =>
      Object.values(progressById)
        .filter((p) => p.masteredAt !== null)
        .map((p) => ({ progress: p, scripture: getScriptureById(p.scriptureId) }))
        .filter((c): c is { progress: (typeof c)['progress']; scripture: Scripture } => c.scripture !== undefined)
        .sort((a, b) => b.progress.masteredAt!.localeCompare(a.progress.masteredAt!)),
    [progressById],
  )

  const weekAgo = Date.now() - 7 * 86_400_000
  const shown = collected.filter(
    ({ progress, scripture }) =>
      (topicId === null || scripture.topicIds.includes(topicId)) &&
      (level === 'all' || (level === 'mastered') === (progress.status === 'mastered')) &&
      (!recentOnly || new Date(progress.masteredAt!).getTime() >= weekAgo),
  )
  const topicsInCollection = getTopics().filter((t) => collected.some((c) => c.scripture.topicIds.includes(t.id)))

  const chip = (selected: boolean) =>
    `min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ${selected ? 'bg-leaf text-white shadow-soft' : 'bg-cream text-ink-soft ring-1 ring-leaf-light'}`

  return (
    <div className="flex flex-col gap-4 animate-pop-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-leaf-dark">Collection</h1>
        <Link to="/progress" className="inline-flex min-h-11 items-center font-bold text-leaf-dark underline">
          My progress
        </Link>
      </div>

      {collected.length === 0 ? (
        <EmptyState
          icon="🃏"
          title="Your collection is waiting"
          message={`Master a verse to add its card here. Mastery takes a strong score and successful recalls on ${REQUIRED_RECALL_DAYS} separate days — slow and steady!`}
          action={
            <Link to="/garden" className="inline-flex min-h-11 items-center rounded-full bg-leaf px-5 font-bold text-white">
              Continue learning
            </Link>
          }
        />
      ) : (
        <>
          <p className="font-bold text-ink-soft">
            {collected.length} {collected.length === 1 ? 'verse' : 'verses'} collected
          </p>
          <div role="group" aria-label="Mastery level" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {(
              [
                ['all', 'All'],
                ['mastered', 'Mastered'],
                ['needs-review', 'Needs a review'],
              ] as const
            ).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={level === value} onClick={() => setLevel(value)} className={chip(level === value)}>
                {label}
              </button>
            ))}
            <button type="button" aria-pressed={recentOnly} onClick={() => setRecentOnly(!recentOnly)} className={chip(recentOnly)}>
              Recently mastered
            </button>
          </div>
          <div role="group" aria-label="Topics" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            <button type="button" aria-pressed={topicId === null} onClick={() => setTopicId(null)} className={chip(topicId === null)}>
              All topics
            </button>
            {topicsInCollection.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={topicId === t.id}
                onClick={() => setTopicId(topicId === t.id ? null : t.id)}
                className={chip(topicId === t.id)}
              >
                <span aria-hidden="true">{t.icon} </span>
                {t.name}
              </button>
            ))}
          </div>

          {shown.length === 0 ? (
            <p className="py-6 text-center text-ink-soft">No cards match these filters.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
              {shown.map(({ progress, scripture }, i) => {
                const topic = getTopicById(scripture.topicIds[0])
                return (
                  <li key={scripture.id}>
                    <Link
                      to={`/scriptures/${scripture.id}`}
                      className={`flex aspect-[3/4] flex-col justify-between rounded-card bg-gradient-to-br p-3 shadow-soft ring-2 ring-gold/70 transition hover:-translate-y-0.5 ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]}`}
                    >
                      <span className="flex items-start justify-between">
                        <span className="text-xs font-extrabold uppercase text-leaf-dark">{scripture.translation}</span>
                        <span aria-hidden="true">{progress.status === 'mastered' ? '🌟' : '💧'}</span>
                      </span>
                      <span className="self-center text-5xl" aria-hidden="true">
                        {topic?.icon}
                      </span>
                      <span>
                        <span className="block font-extrabold text-leaf-dark">{scripture.reference}</span>
                        <span className="block text-xs font-bold text-ink-soft">{topic?.name}</span>
                        <span className="block text-xs text-ink-soft">
                          Mastered {new Date(progress.masteredAt!).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {progress.status !== 'mastered' && <span className="block text-xs font-bold text-[#8a2f22]">Needs a review</span>}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

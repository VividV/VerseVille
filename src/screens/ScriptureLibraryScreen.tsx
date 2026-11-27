import { useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { EmptyState } from '../components/common/EmptyState'
import { ScriptureCard } from '../components/scripture/ScriptureCard'
import { getScriptures, getTopics } from '../engine/scripture/scriptureCatalog'
import { queryLibrary } from '../engine/scripture/scriptureSearch'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import type { LibraryFilter } from '../types/scripture'

const FILTERS: { value: LibraryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'learning', label: 'Learning' },
  { value: 'review-due', label: 'Review Due' },
  { value: 'mastered', label: 'Mastered' },
]

const EMPTY_MESSAGES: Record<LibraryFilter, string> = {
  all: 'No scriptures match your search. Try another word or topic.',
  new: 'No new scriptures match. Try clearing your search.',
  learning: "You aren't learning any scriptures that match yet. Start one from the New list!",
  'review-due': 'Nothing is due for review. Well done — your garden is well watered.',
  mastered: 'No mastered scriptures yet. Keep reviewing and they will bloom here.',
}

function isFilter(value: string | null): value is LibraryFilter {
  return FILTERS.some((f) => f.value === value)
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'min-h-11 shrink-0 rounded-full px-4 text-sm font-bold whitespace-nowrap transition',
        selected ? 'bg-leaf text-white shadow-soft' : 'bg-cream text-ink-soft ring-1 ring-leaf-light hover:bg-leaf-light',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function ScriptureLibraryScreen() {
  // Search and filters live in the URL, so "back" from a scripture returns to the same list.
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const topicId = params.get('topic')
  const statusParam = params.get('status')
  const filter: LibraryFilter = isFilter(statusParam) ? statusParam : 'all'

  const translation = useSettingsStore((s) => s.settings.preferredTranslation)
  const progressById = useGameStore((s) => s.scriptureProgress)
  const topics = getTopics()

  const scriptures = useMemo(() => getScriptures(translation), [translation])
  const results = useMemo(
    () => queryLibrary(scriptures, progressById, { search, topicId, filter }, new Date()),
    [scriptures, progressById, search, topicId, filter],
  )
  const now = new Date()

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const hasNarrowing = search !== '' || topicId !== null || filter !== 'all'

  return (
    <div className="flex flex-col gap-4 animate-pop-in">
      <h1 className="text-2xl font-extrabold text-leaf-dark">Scriptures</h1>

      <div role="search">
        <label htmlFor="scripture-search" className="sr-only">
          Search scriptures
        </label>
        <input
          id="scripture-search"
          type="search"
          value={search}
          onChange={(e) => update('q', e.target.value)}
          placeholder="Search by reference, topic or words"
          className="min-h-12 w-full rounded-full border-2 border-leaf-light bg-white px-5 text-base focus:border-leaf focus:outline-none"
        />
      </div>

      <div role="group" aria-label="Learning status" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <Chip key={f.value} selected={filter === f.value} onClick={() => update('status', f.value === 'all' ? null : f.value)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <div role="group" aria-label="Topics" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip selected={topicId === null} onClick={() => update('topic', null)}>
          All topics
        </Chip>
        {topics.map((t) => (
          <Chip key={t.id} selected={topicId === t.id} onClick={() => update('topic', topicId === t.id ? null : t.id)}>
            <span aria-hidden="true">{t.icon} </span>
            {t.name}
          </Chip>
        ))}
      </div>

      <p className="text-sm font-bold text-ink-soft" aria-live="polite">
        {results.length} {results.length === 1 ? 'scripture' : 'scriptures'}
      </p>

      {results.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Nothing here yet"
          message={search || topicId ? EMPTY_MESSAGES.all : EMPTY_MESSAGES[filter]}
          action={
            hasNarrowing && (
              <Button variant="secondary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                Clear search and filters
              </Button>
            )
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {results.map((s) => (
            <li key={s.id}>
              <ScriptureCard scripture={s} progress={progressById[s.id]} now={now} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import type { Scripture } from '../../types/scripture'
import { scoreRecall } from '../../engine/memorisation/recallScoring'
import { Button } from '../common/Button'
import type { GameFinish } from './MissingWordsGame'

export function VerseRecallGame({ scripture, onFinish }: { scripture: Scripture; onFinish: (result: GameFinish) => void }) {
  const [attempt, setAttempt] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!attempt.trim()) return
    const score = scoreRecall(scripture.text, attempt)
    onFinish({ accuracy: score.accuracy, details: { kind: 'recall', score, attempt } })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="rounded-card bg-cream p-5 text-center shadow-soft">
        <p className="text-sm font-bold uppercase tracking-wide text-ink-soft">From memory</p>
        <p className="mt-1 text-3xl font-extrabold text-leaf-dark">{scripture.reference}</p>
        <p className="mt-1 text-sm text-ink-soft">
          {scripture.wordCount} words · capitals and punctuation don't matter
        </p>
      </div>

      <label htmlFor="recall-input" className="font-bold text-leaf-dark">
        Type the verse
      </label>
      <textarea
        id="recall-input"
        value={attempt}
        onChange={(e) => setAttempt(e.target.value)}
        rows={6}
        autoCapitalize="sentences"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-2xl border-2 border-leaf-light bg-white p-4 text-lg leading-relaxed focus:border-leaf focus:outline-none"
        placeholder="Write what you remember…"
      />

      <Button type="submit" size="lg" fullWidth disabled={!attempt.trim()}>
        Check my recall
      </Button>
    </form>
  )
}

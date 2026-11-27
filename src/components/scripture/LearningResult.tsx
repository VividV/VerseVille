import type { CompletedGame } from '../../store/gameStore'
import { describeReviewDate } from '../../utils/dateUtils'
import { REQUIRED_RECALL_DAYS } from '../../engine/memorisation/mastery'
import { ProgressBar } from '../common/ProgressBar'
import { MasteryBadge } from './MasteryBadge'

const NOTES = {
  gained: (n: number) => `+${n} mastery`,
  reduced: () => 'Mastery dipped a little. That’s normal — you’ll review it again tomorrow.',
  'needs-recall': () => 'Try Verse Recall to grow this verse further — it’s the only way past Growing.',
  'already-today': () => 'Mastery already grew from this activity today. Extra practice still helps it stick!',
  'not-successful': () => 'Keep going — a little more practice and your mastery will grow.',
}

/** Mastery progress and next review after a game (spec Screen 10). */
export function LearningResult({ game, now }: { game: CompletedGame; now: Date }) {
  const { progress, masteryChange, masteryNote, events } = game.update
  const recallDays = progress.successfulRecallDays.length

  return (
    <section aria-labelledby="learning-heading" className="rounded-card bg-cream p-4 shadow-soft">
      {events.scriptureMastered && (
        <p className="mb-3 rounded-2xl bg-gold/40 p-3 text-center font-extrabold text-ink animate-pop-in">
          🌟 Mastered! This verse is now part of your collection.
        </p>
      )}
      {events.scriptureLearned && !events.scriptureMastered && (
        <p className="mb-3 rounded-2xl bg-leaf-light p-3 text-center font-extrabold text-leaf-dark animate-pop-in">
          🌱 Scripture learned! Now reviews will help it grow strong.
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <h2 id="learning-heading" className="text-lg font-extrabold text-leaf-dark">
          Mastery
        </h2>
        <MasteryBadge status={progress.status} />
      </div>
      <div className="mt-2 flex justify-between text-sm font-bold text-ink-soft">
        <span>{masteryNote === 'gained' ? NOTES.gained(masteryChange) : 'Score'}</span>
        <span>{progress.masteryScore} / 100</span>
      </div>
      <ProgressBar value={progress.masteryScore} label="Mastery" tone="gold" className="mt-1" />
      {masteryNote !== 'gained' && <p className="mt-2 text-sm text-ink-soft">{NOTES[masteryNote]()}</p>}
      {progress.status !== 'mastered' && progress.masteryScore >= 50 && (
        <p className="mt-2 text-sm text-ink-soft">
          Recalled on {recallDays} of {REQUIRED_RECALL_DAYS} separate days needed for Mastered.
        </p>
      )}
      {progress.nextReviewAt && (
        <p className="mt-3 text-ink-soft">
          Next review: <strong className="text-ink">{describeReviewDate(progress.nextReviewAt, now)}</strong>
        </p>
      )}
    </section>
  )
}

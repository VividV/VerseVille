import type { PlayerScripture } from '../../types/scripture'
import { getScriptureStatus } from '../../engine/scripture/scriptureStatus'
import { describeReviewDate } from '../../utils/dateUtils'
import { ProgressBar } from '../common/ProgressBar'
import { MasteryBadge } from './MasteryBadge'

/** Learning progress for one scripture: status, mastery score and next review. */
export function ScriptureProgress({ progress, now }: { progress: PlayerScripture | undefined; now: Date }) {
  const status = getScriptureStatus(progress)
  return (
    <section aria-labelledby="progress-heading" className="rounded-card bg-cream p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <h2 id="progress-heading" className="text-lg font-extrabold text-leaf-dark">
          Your progress
        </h2>
        <MasteryBadge status={status} />
      </div>
      {progress ? (
        <>
          <div className="mt-3 flex justify-between text-sm font-bold text-ink-soft">
            <span>Mastery</span>
            <span>{progress.masteryScore} / 100</span>
          </div>
          <ProgressBar value={progress.masteryScore} label="Mastery" className="mt-1" tone="gold" />
          {progress.nextReviewAt && (
            <p className="mt-3 text-sm text-ink-soft">
              Next review: <strong className="text-ink">{describeReviewDate(progress.nextReviewAt, now)}</strong>
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-ink-soft">You haven't started this scripture yet.</p>
      )}
    </section>
  )
}

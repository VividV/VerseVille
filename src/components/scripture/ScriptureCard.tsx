import { Link } from 'react-router-dom'
import type { PlayerScripture, Scripture } from '../../types/scripture'
import { getScriptureStatus, isReviewDue } from '../../engine/scripture/scriptureStatus'
import { getTopicNames } from '../../engine/scripture/scriptureCatalog'
import { ProgressBar } from '../common/ProgressBar'
import { MasteryBadge } from './MasteryBadge'

export interface ScriptureCardProps {
  scripture: Scripture
  progress: PlayerScripture | undefined
  now: Date
}

export function ScriptureCard({ scripture, progress, now }: ScriptureCardProps) {
  const status = getScriptureStatus(progress)
  const due = isReviewDue(progress, now)
  const topics = getTopicNames(scripture).slice(0, 2).join(' · ')

  return (
    <Link
      to={`/scriptures/${scripture.id}`}
      className="block rounded-card bg-cream p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold text-leaf-dark">{scripture.reference}</h3>
          <p className="truncate text-sm font-semibold text-ink-soft">{topics}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <MasteryBadge status={status} />
          {due && <span className="rounded-full bg-[#b64b3c] px-2 py-0.5 text-xs font-extrabold text-white">Review due</span>}
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-ink">{scripture.text}</p>
      <ProgressBar value={progress?.masteryScore ?? 0} label={`${scripture.reference} mastery`} className="mt-3" tone="gold" />
    </Link>
  )
}

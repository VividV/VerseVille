import type { ScriptureStatus } from '../../types/scripture'
import { STATUS_LABELS } from '../../engine/scripture/scriptureStatus'

const STYLES: Record<ScriptureStatus, string> = {
  new: 'bg-sky/40 text-ink',
  learning: 'bg-peach/60 text-ink',
  growing: 'bg-leaf-light text-leaf-dark',
  strong: 'bg-leaf text-white',
  mastered: 'bg-gold text-ink',
}

const ICONS: Record<ScriptureStatus, string> = {
  new: '🌰',
  learning: '🌱',
  growing: '🌿',
  strong: '🌳',
  mastered: '🌟',
}

export function MasteryBadge({ status }: { status: ScriptureStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${STYLES[status]}`}>
      <span aria-hidden="true">{ICONS[status]}</span>
      {STATUS_LABELS[status]}
    </span>
  )
}

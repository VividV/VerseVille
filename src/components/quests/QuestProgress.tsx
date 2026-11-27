import { ProgressBar } from '../common/ProgressBar'

export function QuestProgress({ progress, target, label }: { progress: number; target: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <ProgressBar value={progress} max={target} label={label} className="flex-1" />
      <span className="text-sm font-extrabold tabular-nums text-ink-soft">
        {progress}/{target}
      </span>
    </div>
  )
}

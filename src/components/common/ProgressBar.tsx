export interface ProgressBarProps {
  /** Current value. Clamped between 0 and `max`. */
  value: number
  max?: number
  /** Accessible name, read by screen readers. */
  label: string
  className?: string
  tone?: 'leaf' | 'gold'
}

export function ProgressBar({ value, max = 100, label, className = '', tone = 'leaf' }: ProgressBarProps) {
  const safeMax = max > 0 ? max : 1
  const clamped = Math.min(Math.max(value, 0), safeMax)
  const percent = (clamped / safeMax) * 100
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={clamped}
      className={`h-2.5 w-full overflow-hidden rounded-full bg-leaf-light ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${tone === 'gold' ? 'bg-gold' : 'bg-leaf'}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

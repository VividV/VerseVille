import { useMemo } from 'react'

const COLOURS = ['#E8B85B', '#5D9868', '#F3C4A8', '#A8D5E5', '#C9725A', '#DDEBD8']

/** A short burst of falling confetti. Purely decorative; hidden with reduced motion. */
export function Celebration({ pieces = 40 }: { pieces?: number }) {
  const confetti = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        colour: COLOURS[i % COLOURS.length],
        delay: `${(i % 10) * 0.08}s`,
        duration: `${2 + (i % 5) * 0.3}s`,
        drift: `${((i * 53) % 120) - 60}px`,
      })),
    [pieces],
  )
  return (
    <div className="confetti pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
      {confetti.map((c, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: c.left,
              background: c.colour,
              '--delay': c.delay,
              '--duration': c.duration,
              '--drift': c.drift,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

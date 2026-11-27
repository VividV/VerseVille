import type { Scripture } from '../../types/scripture'

/** The verse itself, set large and comfortable to read (spec §5.3). */
export function ScriptureText({ scripture }: { scripture: Scripture }) {
  return (
    <figure className="rounded-card bg-cream p-5 shadow-soft">
      <blockquote className="text-[1.35rem] font-semibold leading-relaxed text-ink">{scripture.text}</blockquote>
      <figcaption className="mt-3 font-extrabold text-leaf-dark">
        {scripture.reference} <span className="font-semibold text-ink-soft">· {scripture.translation}</span>
      </figcaption>
    </figure>
  )
}

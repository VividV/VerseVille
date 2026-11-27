import type { RecallScore } from '../../types/games'

/** Word-by-word feedback after Verse Recall: what was right, wrong, missing or extra. */
export function RecallFeedback({ score }: { score: RecallScore }) {
  return (
    <section aria-labelledby="feedback-heading" className="rounded-card bg-cream p-4 shadow-soft">
      <h2 id="feedback-heading" className="text-lg font-extrabold text-leaf-dark">
        Your recall, word by word
      </h2>
      <p className="mt-2 text-lg leading-loose">
        {score.diff.map((d, i) => {
          switch (d.type) {
            case 'correct':
              return <span key={i}>{d.expected} </span>
            case 'wrong':
              return (
                <span key={i}>
                  <del className="rounded bg-[#f7dcd6] px-1 text-[#8a2f22]" aria-label={`you wrote ${d.actual}`}>
                    {d.actual}
                  </del>{' '}
                  <ins className="rounded bg-leaf-light px-1 font-bold text-leaf-dark no-underline" aria-label={`should be ${d.expected}`}>
                    {d.expected}
                  </ins>{' '}
                </span>
              )
            case 'missing':
              return (
                <span key={i}>
                  <ins className="rounded bg-gold/40 px-1 font-bold text-ink no-underline" aria-label={`missed ${d.expected}`}>
                    {d.expected}
                  </ins>{' '}
                </span>
              )
            case 'extra':
              return (
                <span key={i}>
                  <del className="rounded px-1 text-ink-soft" aria-label={`extra word ${d.actual}`}>
                    {d.actual}
                  </del>{' '}
                </span>
              )
          }
        })}
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
        <li>
          <span className="rounded bg-leaf-light px-1 font-bold text-leaf-dark">word</span> correction ({score.wrongWords})
        </li>
        <li>
          <span className="rounded bg-gold/40 px-1 font-bold">word</span> missed ({score.missingWords})
        </li>
        <li>
          <del className="px-1">word</del> extra ({score.extraWords})
        </li>
      </ul>
    </section>
  )
}

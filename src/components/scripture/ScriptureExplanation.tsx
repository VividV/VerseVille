export function ScriptureExplanation({ text }: { text: string }) {
  return (
    <section aria-labelledby="explanation-heading" className="rounded-card bg-leaf-light/60 p-4">
      <h2 id="explanation-heading" className="flex items-center gap-2 text-lg font-extrabold text-leaf-dark">
        <span aria-hidden="true">💡</span> What it means
      </h2>
      <p className="mt-1 leading-relaxed text-ink">{text}</p>
    </section>
  )
}

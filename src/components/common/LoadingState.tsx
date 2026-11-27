export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40dvh] flex-col items-center justify-center gap-4 p-6">
      <span className="text-5xl animate-sway" aria-hidden="true">
        🌱
      </span>
      <p className="font-semibold text-ink-soft">{message}</p>
    </div>
  )
}

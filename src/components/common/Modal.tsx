import { useEffect, useId, useRef, type ReactNode } from 'react'

export interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Buttons shown at the bottom of the modal. */
  footer?: ReactNode
}

/** Accessible bottom-sheet style dialog. Closes on Escape or backdrop tap. */
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/40" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-t-3xl bg-cream p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-soft animate-pop-in sm:rounded-3xl"
      >
        <h2 id={titleId} className="mb-3 text-xl font-extrabold text-leaf-dark">
          {title}
        </h2>
        <div className="text-ink">{children}</div>
        {footer && <div className="mt-6 flex flex-col gap-3">{footer}</div>}
      </div>
    </div>
  )
}

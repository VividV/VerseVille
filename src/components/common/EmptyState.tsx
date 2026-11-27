import type { ReactNode } from 'react'

export interface EmptyStateProps {
  icon: string
  title: string
  message: string
  action?: ReactNode
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center animate-pop-in">
      <span className="text-5xl" aria-hidden="true">
        {icon}
      </span>
      <h2 className="text-xl font-extrabold text-leaf-dark">{title}</h2>
      <p className="max-w-xs text-ink-soft">{message}</p>
      {action}
    </div>
  )
}

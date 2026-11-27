import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-card bg-cream p-4 shadow-soft ${className}`} {...rest} />
}

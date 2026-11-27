/** Small inline icons so we don't need an icon library. Decorative: hidden from screen readers. */
import type { SVGProps } from 'react'

const base: SVGProps<SVGSVGElement> = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const GardenIcon = () => (
  <svg {...base}>
    <path d="M12 21v-8" />
    <path d="M12 13c-4 0-6-3-6-7 4 0 6 3 6 7Z" />
    <path d="M12 11c0-4 2-7 6-7 0 4-2 7-6 7Z" />
    <path d="M4 21h16" />
  </svg>
)
export const BookIcon = () => (
  <svg {...base}>
    <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" />
    <path d="M4 19V5" />
    <path d="M12 7v6M9 10h6" />
  </svg>
)
export const QuestIcon = () => (
  <svg {...base}>
    <path d="M9 11l2 2 4-4" />
    <rect x="4" y="3" width="16" height="18" rx="3" />
  </svg>
)
export const CollectionIcon = () => (
  <svg {...base}>
    <rect x="3" y="6" width="13" height="15" rx="2" />
    <path d="M8 3h11a2 2 0 0 1 2 2v12" />
  </svg>
)
export const ProfileIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
)
export const SettingsIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </svg>
)

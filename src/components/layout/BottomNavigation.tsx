import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { BookIcon, CollectionIcon, GardenIcon, ProfileIcon, QuestIcon } from './icons'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/garden', label: 'Garden', icon: <GardenIcon /> },
  { to: '/scriptures', label: 'Scriptures', icon: <BookIcon /> },
  { to: '/quests', label: 'Quests', icon: <QuestIcon /> },
  { to: '/collection', label: 'Collection', icon: <CollectionIcon /> },
  { to: '/profile', label: 'Profile', icon: <ProfileIcon /> },
]

export function BottomNavigation() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-leaf-light bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md justify-between px-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[0.7rem] font-bold transition',
                  isActive ? 'text-leaf-dark' : 'text-ink-soft hover:text-leaf',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`rounded-full px-3 py-0.5 ${isActive ? 'bg-leaf-light' : ''}`}>{item.icon}</span>
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

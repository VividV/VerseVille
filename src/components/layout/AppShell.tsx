import { Outlet } from 'react-router-dom'
import { TopResourceBar } from './TopResourceBar'
import { BottomNavigation } from './BottomNavigation'

/** Layout for the main game screens: resource bar on top, tab bar at the bottom. */
export function AppShell() {
  return (
    <div className="min-h-dvh bg-paper">
      <TopResourceBar />
      <main className="mx-auto max-w-md px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-2">
        <Outlet />
      </main>
      <BottomNavigation />
    </div>
  )
}

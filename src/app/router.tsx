import { Navigate, Outlet, createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { useGameStore } from '../store/gameStore'
import { WelcomeScreen } from '../screens/WelcomeScreen'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { GardenScreen } from '../screens/GardenScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { ComingSoonScreen } from '../screens/ComingSoonScreen'
import { NotFoundScreen } from '../screens/NotFoundScreen'

/** Only players who have finished onboarding can see the game screens. */
function RequirePlayer() {
  const profile = useGameStore((s) => s.profile)
  return profile ? <Outlet /> : <Navigate to="/welcome" replace />
}

/** New players only: returning players skip welcome/onboarding. */
function RequireNoPlayer() {
  const profile = useGameStore((s) => s.profile)
  return profile ? <Navigate to="/garden" replace /> : <Outlet />
}

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/garden" replace /> },
  {
    element: <RequireNoPlayer />,
    children: [
      { path: '/welcome', element: <WelcomeScreen /> },
      { path: '/onboarding', element: <OnboardingScreen /> },
    ],
  },
  {
    element: <RequirePlayer />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/garden', element: <GardenScreen /> },
          {
            path: '/scriptures',
            element: (
              <ComingSoonScreen
                title="Scriptures"
                icon="📖"
                message="The scripture library is the next thing we're planting. You'll be able to browse, search and learn verses here."
              />
            ),
          },
          {
            path: '/quests',
            element: (
              <ComingSoonScreen
                title="Daily Quests"
                icon="🗒️"
                message="Daily quests will appear here once scripture games are ready."
              />
            ),
          },
          {
            path: '/collection',
            element: (
              <ComingSoonScreen
                title="Collection"
                icon="🃏"
                message="Every scripture you master will be added to your collection as a card."
              />
            ),
          },
          { path: '/profile', element: <ProfileScreen /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundScreen /> },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}

/** Router for tests: starts at `initialPath` without a real browser URL. */
export function createTestRouter(initialPath: string) {
  return createMemoryRouter(routes, { initialEntries: [initialPath] })
}

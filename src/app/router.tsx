import { Navigate, Outlet, createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { useGameStore } from '../store/gameStore'
import { lazy, Suspense, type ComponentType } from 'react'
import { LoadingState } from '../components/common/LoadingState'
import { WelcomeScreen } from '../screens/WelcomeScreen'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { GardenScreen } from '../screens/GardenScreen'
import { NotFoundScreen } from '../screens/NotFoundScreen'
import { RouteErrorScreen } from '../screens/RouteErrorScreen'

/**
 * Screens other than Welcome, Onboarding and Garden are loaded when first
 * opened, so the app starts quickly on a phone.
 */
function lazyScreen<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  const Screen = lazy(async () => ({ default: (await load())[name] as ComponentType }))
  return (
    <Suspense fallback={<LoadingState />}>
      <Screen />
    </Suspense>
  )
}

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

const appRoutes: RouteObject[] = [
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
      // Games are full-screen (no tab bar) so players can focus.
      { path: '/games/missing-words/:scriptureId', element: lazyScreen(() => import('../screens/MissingWordsScreen'), 'MissingWordsScreen') },
      { path: '/games/word-order/:scriptureId', element: lazyScreen(() => import('../screens/WordOrderScreen'), 'WordOrderScreen') },
      { path: '/games/recall/:scriptureId', element: lazyScreen(() => import('../screens/VerseRecallScreen'), 'VerseRecallScreen') },
      { path: '/game-complete', element: lazyScreen(() => import('../screens/GameCompletionScreen'), 'GameCompletionScreen') },
      {
        element: <AppShell />,
        children: [
          { path: '/garden', element: <GardenScreen /> },
          { path: '/scriptures', element: lazyScreen(() => import('../screens/ScriptureLibraryScreen'), 'ScriptureLibraryScreen') },
          { path: '/scriptures/:scriptureId', element: lazyScreen(() => import('../screens/ScriptureDetailScreen'), 'ScriptureDetailScreen') },
          { path: '/scriptures/:scriptureId/games', element: lazyScreen(() => import('../screens/GameSelectionScreen'), 'GameSelectionScreen') },
          { path: '/quests', element: lazyScreen(() => import('../screens/DailyQuestsScreen'), 'DailyQuestsScreen') },
          { path: '/collection', element: lazyScreen(() => import('../screens/CollectionScreen'), 'CollectionScreen') },
          { path: '/progress', element: lazyScreen(() => import('../screens/ProgressScreen'), 'ProgressScreen') },
          // The village look began as a preview; it is now the garden itself.
          { path: '/village-preview', element: <Navigate to="/garden" replace /> },
          { path: '/shop', element: lazyScreen(() => import('../screens/GardenShopScreen'), 'GardenShopScreen') },
          { path: '/profile', element: lazyScreen(() => import('../screens/ProfileScreen'), 'ProfileScreen') },
        ],
      },
    ],
  },
  // Sign in / create account: open to guests and new devices alike.
  { path: '/account', element: lazyScreen(() => import('../screens/AccountScreen'), 'AccountScreen') },
  { path: '*', element: <NotFoundScreen /> },
]

/** One parent route so any screen error shows the friendly error screen. */
export const routes: RouteObject[] = [{ element: <Outlet />, errorElement: <RouteErrorScreen />, children: appRoutes }]

export function createAppRouter() {
  return createBrowserRouter(routes)
}

/** Router for tests: starts at `initialPath` without a real browser URL. */
export function createTestRouter(initialPath: string) {
  return createMemoryRouter(routes, { initialEntries: [initialPath] })
}

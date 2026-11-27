import { Navigate, Outlet, createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { useGameStore } from '../store/gameStore'
import { WelcomeScreen } from '../screens/WelcomeScreen'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { GardenScreen } from '../screens/GardenScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { ScriptureLibraryScreen } from '../screens/ScriptureLibraryScreen'
import { ScriptureDetailScreen } from '../screens/ScriptureDetailScreen'
import { GameSelectionScreen } from '../screens/GameSelectionScreen'
import { MissingWordsScreen } from '../screens/MissingWordsScreen'
import { WordOrderScreen } from '../screens/WordOrderScreen'
import { VerseRecallScreen } from '../screens/VerseRecallScreen'
import { GameCompletionScreen } from '../screens/GameCompletionScreen'
import { GardenShopScreen } from '../screens/GardenShopScreen'
import { DailyQuestsScreen } from '../screens/DailyQuestsScreen'
import { CollectionScreen } from '../screens/CollectionScreen'
import { ProgressScreen } from '../screens/ProgressScreen'
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
      // Games are full-screen (no tab bar) so players can focus.
      { path: '/games/missing-words/:scriptureId', element: <MissingWordsScreen /> },
      { path: '/games/word-order/:scriptureId', element: <WordOrderScreen /> },
      { path: '/games/recall/:scriptureId', element: <VerseRecallScreen /> },
      { path: '/game-complete', element: <GameCompletionScreen /> },
      {
        element: <AppShell />,
        children: [
          { path: '/garden', element: <GardenScreen /> },
          { path: '/scriptures', element: <ScriptureLibraryScreen /> },
          { path: '/scriptures/:scriptureId', element: <ScriptureDetailScreen /> },
          { path: '/scriptures/:scriptureId/games', element: <GameSelectionScreen /> },
          { path: '/quests', element: <DailyQuestsScreen /> },
          { path: '/collection', element: <CollectionScreen /> },
          { path: '/progress', element: <ProgressScreen /> },
          { path: '/shop', element: <GardenShopScreen /> },
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

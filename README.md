# VerseVille

**Grow your world. Remember His Word.**

A mobile-first scripture memorisation game: learn and recall Bible verses to grow a cozy garden village.

## Status

Built in phases, following the product specification.

| Phase | What | Status |
| --- | --- | --- |
| 1 | Project foundation: app shell, routing, design system, state, local saving | ✅ Done |
| 2 | Scripture engine: dataset, library, detail, search & filters | Next |
| 3 | Memorisation games | — |
| 4 | Learning engine (mastery, spaced repetition) | — |
| 5 | Reward engine (XP, coins, seeds, levels) | — |
| 6 | Interactive garden | — |
| 7 | Quests, collection, progress | — |
| 8 | Accounts & cloud sync (Supabase) | — |
| 9 | Polish & testing | — |

## Running it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install        # once, to download dependencies
npm run dev        # start the app at http://localhost:5173
npm test           # run the automated tests
npm run build      # type-check and build for production (output in dist/)
```

To try it on an Android phone on the same Wi-Fi: `npm run dev -- --host`, then open the "Network" address it prints.

## How the code is organised

```
src/
  app/          App entry, router (with new/returning player guards), providers (loading + accessibility)
  components/
    common/     Button, Card, Modal, ProgressBar, LoadingState, EmptyState, GardenBackdrop
    layout/     AppShell, TopResourceBar, BottomNavigation, icons
  screens/      One file per screen
  engine/       Game rules (no React here) — rewards/economy.ts holds starting resources
  store/        Zustand stores: gameStore (player, resources), settingsStore
  services/
    persistence/ localDatabase.ts (IndexedDB wrapper), saveService.ts (what gets saved)
  types/        TypeScript types
  utils/        Dates (player's local day), ids
```

Rules of thumb: screens never talk to IndexedDB directly (they go through stores → `saveService`), and game
calculations live in `src/engine`, not in components. Design colours are tokens in `src/index.css`.

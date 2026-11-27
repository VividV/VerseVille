# VerseVille

**Grow your world. Remember His Word.**

A mobile-first scripture memorisation game: learn and recall Bible verses to grow a cozy garden village.

## Status

Built in phases, following the product specification.

| Phase | What | Status |
| --- | --- | --- |
| 1 | Project foundation: app shell, routing, design system, state, local saving | ✅ Done |
| 2 | Scripture engine: dataset, library, detail, search & filters | ✅ Done |
| 3 | Memorisation games | ✅ Done |
| 4 | Learning engine (mastery, spaced repetition) | ✅ Done |
| 5 | Reward engine (XP, coins, seeds, levels) | Next |
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
    games/      MissingWordsGame, WordOrderGame (tap + drag), VerseRecallGame, results & feedback
    scripture/  ScriptureCard, ScriptureText, ScriptureExplanation, MasteryBadge, ScriptureProgress
    common/     Button, Card, Modal, ProgressBar, LoadingState, EmptyState, GardenBackdrop
    layout/     AppShell, TopResourceBar, BottomNavigation, icons
  screens/      One file per screen
  data/         scriptures.json (66 KJV verses), topics.json — generated, see scripts/scripture-data/
  engine/       Game rules (no React here)
    scripture/  catalogue lookups, search & filters, learning status
    games/      Missing Words & Word Order rules, verse tokens, recommendations, game sessions
    memorisation/ recallScoring, mastery, scheduler (spaced repetition), learningEngine, reviewQueue
    rewards/    economy.ts (starting resources)
  store/        Zustand stores: gameStore (player, resources), settingsStore
  services/
    persistence/ localDatabase.ts (IndexedDB wrapper), saveService.ts (what gets saved)
  types/        TypeScript types
  utils/        Dates (player's local day), ids, text normalisation
```

Rules of thumb: screens never talk to IndexedDB directly (they go through stores → `saveService`), and game
calculations live in `src/engine`, not in components. Design colours are tokens in `src/index.css`.

## Scripture content

The library holds 66 King James Version verses (public domain). Verse text was taken from published KJV data and
cross-checked word-for-word against a second independent source; see `scripts/scripture-data/README.md`.
Explanations were written for VerseVille and should be reviewed by a trusted reader before public release.

## How the games score

- **Missing Words** and **Word Order**: accuracy = items right the first time without a hint. Wrong answers never
  stick and retrying is always allowed.
- **Verse Recall**: capitals, punctuation and spacing are ignored; missing, wrong and extra words are not.
  accuracy = correct words ÷ (verse words + extra words typed), so padding an answer can't reach 100%.
- Result bands follow the spec: below 60%, 60–84%, 85% and above.

## How learning progresses

**Mastery (0–100):** Missing Words +10, Word Order +15, Verse Recall +25 (when successful), failed recall −10.
Learning 0–19 · Growing 20–49 · Strong 50–79 · Mastered 80+ *and* successful recalls on 3 separate days.

VerseVille additions to the spec, to stop shortcuts:
- Success means 60%+ in Missing Words / Word Order and 85%+ in Verse Recall.
- Missing Words and Word Order can raise mastery to 49 at most. Strong and Mastered need independent recall.
- Each kind of mastery change counts once per verse per day (repeating a game can't farm it; a bad day only costs −10 once).

**Reviews:** first review the day after learning, then 1 → 3 → 7 → 14 → 30 → 60 → 120 → 180 days, due at the
player's local midnight. Recall 85%+ while due moves up a step; 60–84% → again in 2 days; below 60% → back to the
start, tomorrow. Practising before a review is due never stretches the interval. Missing Words / Word Order while due
count as a review but keep the same interval.

**Continue Learning** picks: due reviews (most overdue first) → a verse you started but haven't finished → a new verse.
A verse is *learned* once all three activities have been completed.

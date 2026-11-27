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
| 5 | Reward engine (XP, coins, seeds, levels) | ✅ Done |
| 6 | Interactive garden | ✅ Done |
| 7 | Quests, collection, progress | ✅ Done |
| 8 | Accounts & cloud sync (Supabase) | Not started — needs a Supabase project |
| 9 | Polish & testing | ✅ Done |

## Running it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install        # once, to download dependencies
npm run dev        # start the app at http://localhost:5173
npm test           # run the automated tests
npm run build      # type-check and build for production (output in dist/)
```

To try it on an Android phone on the same Wi-Fi: `npm run dev -- --host`, then open the "Network" address it prints.

To try the real, installable version locally: `npm run build && npm run preview`.

## Putting it online (Vercel) and installing on Android

1. Push this repository to GitHub, then in Vercel choose **Add New → Project** and import it. `vercel.json` already
   sets the build command, output folder, page routing and caching. No environment variables are needed.
2. Open the site on an Android phone in Chrome → menu → **Install app** (or **Add to Home screen**).
3. After the first visit VerseVille works **offline**: the service worker (`public/sw.js`) saves every app file.
   Progress is saved on the phone in IndexedDB, and the app asks the browser to keep that data even when space is low.

Installing needs HTTPS, which Vercel provides. When you release changes, users get them on their next visit.

## How the code is organised

```
src/
  app/          App entry, router (with new/returning player guards), providers (loading + accessibility)
  components/
    garden/     GardenCanvas, item drawings (itemArt), placement bar, item & land modals
    games/      MissingWordsGame, WordOrderGame (tap + drag), VerseRecallGame, results & feedback
    scripture/  ScriptureCard, ScriptureText, ScriptureExplanation, MasteryBadge, ScriptureProgress
    common/     Button, Card, Modal, ProgressBar, LoadingState, EmptyState, GardenBackdrop
    layout/     AppShell, TopResourceBar, BottomNavigation, icons
  screens/      One file per screen
  data/         scriptures.json (66 KJV verses), topics.json — generated, see scripts/scripture-data/
                buildings.json, decorations.json, expansions.json, levels.json, quests.json — edit freely
  engine/       Game rules (no React here)
    scripture/  catalogue lookups, search & filters, learning status
    games/      Missing Words & Word Order rules, verse tokens, recommendations, game sessions
    memorisation/ recallScoring, mastery, scheduler (spaced repetition), learningEngine, reviewQueue
    rewards/    rewardCalculator.ts (all rewards, caps, multipliers), economy.ts (balances, no negatives)
    progression/ playerLevel.ts (XP → level), gardenUnlocks.ts (land expansions)
    garden/     catalog, gardenGrid (placement rules), shop, startingGarden
    quests/     questEngine.ts (daily quests, daily goal, streak)
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

## Rewards

All amounts live in `REWARD_CONFIG` in `src/engine/rewards/rewardCalculator.ts`.

| Source | XP | Coins | Seeds |
| --- | --- | --- | --- |
| Missing Words / Word Order (first time today, per verse) | 5 | 5 | – |
| Verse Recall (first time today, per verse) | 15 | 10 | – |
| Successful review | – | 5 | – |
| Scripture learned (once) | 10 | – | 1 |
| Scripture mastered (once) | 25 | 15 | 1 |

Game and review rewards are multiplied by accuracy (85–94% ×1.2, 95%+ ×1.5) and need at least 60% accuracy.
Milestones are never multiplied. Games and reviews can give at most 200 coins and 300 XP per day.
Levels: XP needed for the next level = 100 + level × 50; XP is never reset.

Every reward is a transaction with a predictable id (e.g. `scripture-mastered:psalm-23-1-kjv`). A finished game, its
progress, its transactions and the new balance are saved in one IndexedDB transaction; transactions are *added*, so a
repeat of the same id makes the database refuse the whole save. Rewards can't be granted twice.

## The garden

- 8 tiles wide. The first 8 rows (8 × 8) are open; each land expansion (`src/data/expansions.json`) adds rows below:
  Meadow (level 3, 10 mastered, 100 coins), Orchard (level 5, 25 mastered, 250 coins), Riverside (level 8, 50 mastered, 500 coins).
- New players start with a cottage, the Scripture Tree, three flower beds and a path. The pond can't be built on.
- Items (`src/data/buildings.json`, `decorations.json`) have a size, coin/seed cost, unlock level and whether they're
  unique. Unique buildings can be owned once; decorations, plants and paths can be bought again and again.
- Buying puts an item in "Ready to place". Placing: tap a spot, check the preview, Confirm. Tap any item to move it or
  put it away (the cottage and Scripture Tree always stay). Tapping the Scripture Tree continues learning.
- Purchases and land are recorded as transactions with negative amounts, saved together with the new balance.

## Daily quests, collection and progress

- **Daily goal** (1, 3 or 5 scriptures, set in Profile): a scripture counts once it has a successful game (60%+)
  that day. Reaching the goal gives 1 seed automatically.
- **Quests** (`src/data/quests.json`): three each day — the daily goal, one Verse Recall, and a review quest if
  reviews are due (otherwise "learn one scripture"). Progress comes only from real game events. Completed quests are
  claimed on the Quests screen (each once); unclaimed ones from earlier days stay claimable. A game counts towards the
  day it was *started*, so midnight never resets a quest mid-game.
- **Collection**: a card for every verse ever mastered. Mastered verses are never removed; if mastery dips the card
  shows "Needs a review". Filters: topic, mastery level, recently mastered.
- **My Progress** (Profile → My Progress): headline is *verses you can recall* (Strong + Mastered) and 30-day recall
  accuracy, then learned, mastered, reviews, streak, level and garden stage.

## Polish, accessibility and testing (Phase 9)

- **Sound** (Profile → Sound effects): soft chimes made with the Web Audio API — no audio files.
- **Animation**: confetti for level-ups, mastered verses, daily goals and new land; swaying trees; resource bumps.
  Everything turns off with Profile → Reduce motion or the phone's own reduce-motion setting.
- **Accessibility**: every screen passes an automated axe-core check (0 violations). The spec's primary green
  `#5D9868` was deepened to `#477D52` so white text on buttons meets WCAG AA contrast (4.86:1); the original is kept
  as `--color-leaf-soft`. Adjustable text size, high contrast, screen-reader labels, keyboard support and non-drag
  alternatives for Word Order were built in earlier phases.
- **Speed**: screens load as they're opened; the first screen needs ~134 KB (compressed) of JavaScript.
- **Errors**: any crash shows a friendly screen with a reload button (progress is safe).
- **Learning analytics** (spec §18): events like `game_completed` and `recall_accuracy` are recorded **on the device
  only** (`src/services/analytics/analytics.ts`), with ids and numbers but nothing personal, ready to sync later.
- **Tests**: `npm test` runs 180+ automated tests, including `src/test/definitionOfDone.test.tsx`, which plays the
  whole spec §21 checklist through the real screens: onboarding, learning a verse with all three games, earning,
  building, closing the app and coming back the next day for a review.

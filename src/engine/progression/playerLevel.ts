/**
 * Player levels (spec §12). XP is never reset: the level is worked out from total XP.
 *   XP needed to go from level L to L+1 = 100 + L × 50
 *   Level 1 → 2: 150 XP, 2 → 3: 200 XP, 3 → 4: 250 XP, ...
 */
import levelsJson from '../../data/levels.json'

const LEVEL_TITLES = levelsJson as { level: number; title: string }[]

export function xpForNextLevel(level: number): number {
  return 100 + level * 50
}

/** Total XP needed to reach `level` from level 1. */
export function totalXpForLevel(level: number): number {
  let total = 0
  for (let l = 1; l < level; l++) total += xpForNextLevel(l)
  return total
}

export function levelForXp(totalXp: number): number {
  let level = 1
  let remaining = Math.max(0, totalXp)
  while (remaining >= xpForNextLevel(level)) {
    remaining -= xpForNextLevel(level)
    level++
  }
  return level
}

/** Progress inside the current level, for the XP bar. */
export function levelProgress(totalXp: number): { level: number; xpIntoLevel: number; xpNeeded: number } {
  const level = levelForXp(totalXp)
  return { level, xpIntoLevel: Math.max(0, totalXp) - totalXpForLevel(level), xpNeeded: xpForNextLevel(level) }
}

export function levelTitle(level: number): string {
  const known = LEVEL_TITLES.find((l) => l.level === level)
  return known?.title ?? LEVEL_TITLES[LEVEL_TITLES.length - 1].title
}

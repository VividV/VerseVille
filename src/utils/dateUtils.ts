/**
 * Date helpers. All "day" logic uses the player's LOCAL calendar day,
 * so quests and reviews reset at the player's own midnight (spec §10, §14).
 */

/** Current time as an ISO timestamp. Accepts `now` so tests can be deterministic. */
export function nowIso(now: Date = new Date()): string {
  return now.toISOString()
}

/** Local calendar date as YYYY-MM-DD, e.g. "2026-11-27". */
export function toLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Adds whole local calendar days, keeping the local time of day. */
export function addLocalDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/** Number of local calendar days from `from` to `to` (negative if `to` is earlier). */
export function localDaysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

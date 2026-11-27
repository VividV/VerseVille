/**
 * Learning analytics (spec §18), kept ON THE DEVICE ONLY for now.
 *
 * Events record what happened in the learning loop — never names, free text or
 * anything personal. Nothing is sent anywhere; when cloud accounts arrive
 * (Phase 8) these can be uploaded for the product metrics, with consent.
 * The log keeps the most recent MAX_EVENTS events.
 */
import { deleteRecord, getAllRecords, putRecord } from '../persistence/localDatabase'
import { createId } from '../../utils/idUtils'

export type AnalyticsEventName =
  | 'onboarding_completed'
  | 'scripture_started'
  | 'scripture_learned'
  | 'game_started'
  | 'game_completed'
  | 'recall_accuracy'
  | 'review_completed'
  | 'scripture_mastered'
  | 'garden_item_purchased'
  | 'garden_item_placed'
  | 'daily_goal_completed'

/** Only short ids and numbers are allowed as properties. */
export type AnalyticsProps = Record<string, string | number | boolean>

export interface AnalyticsEvent {
  id: string
  name: AnalyticsEventName
  props: AnalyticsProps
  at: string
}

export const MAX_EVENTS = 1000

/** Records an event. Never throws and never blocks the game. */
export function track(name: AnalyticsEventName, props: AnalyticsProps = {}, now: Date = new Date()): Promise<void> {
  const event: AnalyticsEvent = { id: `${now.getTime()}-${createId()}`, name, props, at: now.toISOString() }
  return putRecord('analytics', event.id, event)
    .then(() => trimLog())
    .catch(() => undefined)
}

let trimming: Promise<void> | null = null
async function trimLog(): Promise<void> {
  if (trimming) return trimming
  trimming = (async () => {
    const events = await getAllRecords<AnalyticsEvent>('analytics')
    if (events.length <= MAX_EVENTS) return
    const oldest = events.sort((a, b) => a.id.localeCompare(b.id)).slice(0, events.length - MAX_EVENTS)
    await Promise.all(oldest.map((e) => deleteRecord('analytics', e.id)))
  })().finally(() => {
    trimming = null
  })
  return trimming
}

export function getEvents(): Promise<AnalyticsEvent[]> {
  return getAllRecords<AnalyticsEvent>('analytics').then((events) => events.sort((a, b) => a.id.localeCompare(b.id)))
}

/**
 * Read-only access to the scripture library and topics.
 * No React here — screens call these functions.
 */
import scripturesJson from '../../data/scriptures.json'
import topicsJson from '../../data/topics.json'
import type { Scripture, Topic } from '../../types/scripture'
import type { TranslationCode } from '../../types/player'

const ALL_SCRIPTURES = scripturesJson as Scripture[]
const ALL_TOPICS = topicsJson as Topic[]
const BY_ID = new Map(ALL_SCRIPTURES.map((s) => [s.id, s]))
const TOPIC_BY_ID = new Map(ALL_TOPICS.map((t) => [t.id, t]))

/** Active scriptures in the chosen translation, in library order. */
export function getScriptures(translation: TranslationCode): Scripture[] {
  return ALL_SCRIPTURES.filter((s) => s.isActive && s.translation === translation)
}

export function getScriptureById(id: string): Scripture | undefined {
  const s = BY_ID.get(id)
  return s?.isActive ? s : undefined
}

/** Related scriptures that exist and are active. */
export function getRelatedScriptures(scripture: Scripture): Scripture[] {
  return scripture.relatedScriptureIds
    .map((id) => getScriptureById(id))
    .filter((s): s is Scripture => s !== undefined)
}

export function getTopics(): Topic[] {
  return ALL_TOPICS
}

export function getTopicById(id: string): Topic | undefined {
  return TOPIC_BY_ID.get(id)
}

/** Topic names for a scripture, e.g. ["Trust", "Peace"]. */
export function getTopicNames(scripture: Scripture): string[] {
  return scripture.topicIds.map((id) => TOPIC_BY_ID.get(id)?.name ?? id)
}

/** Every word from the other scriptures in this translation: wrong options for Missing Words. */
export function getDistractorWords(scriptureId: string, translation: TranslationCode): string[] {
  return getScriptures(translation)
    .filter((s) => s.id !== scriptureId)
    .flatMap((s) => s.text.split(/\s+/))
}

/** For tests and data checks. */
export function getAllScripturesIncludingInactive(): Scripture[] {
  return ALL_SCRIPTURES
}

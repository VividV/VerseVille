import type { VerseToken } from '../../types/games'
import { normaliseText } from '../../utils/textNormalisation'

/**
 * Splits a verse into word tokens. Punctuation stays with its word ("shepherd;"),
 * and every token gets its own id, even when the same word appears twice.
 */
export function tokeniseVerse(text: string): VerseToken[] {
  return text
    .trim()
    .split(/\s+/)
    .filter((part) => normaliseText(part) !== '')
    .map((part, index) => {
      const match = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u.exec(part)!
      return {
        id: `w${index}`,
        index,
        text: part,
        prefix: match[1],
        word: match[2],
        suffix: match[3],
        normalised: normaliseText(part).replace(/\s+/g, ''),
      }
    })
}

/** Short common words that make poor "missing word" blanks. */
export const COMMON_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'be', 'but', 'by', 'for', 'from', 'he', 'his', 'i', 'in', 'is', 'it', 'me', 'my',
  'not', 'o', 'of', 'on', 'or', 'so', 'that', 'the', 'thee', 'thou', 'thy', 'to', 'unto', 'us', 'we', 'ye', 'you',
  'your', 'all', 'are', 'was', 'with', 'him', 'them', 'they', 'this', 'which', 'who', 'shall', 'will', 'hath', 'have',
  'if', 'no', 'nor', 'our', 'their', 'there', 'what', 'when', 'yet', 'also', 'any', 'such', 'these', 'those',
])

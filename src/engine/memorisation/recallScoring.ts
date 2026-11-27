/**
 * Verse Recall scoring (spec §9.3). No AI — a word-by-word comparison.
 *
 * Both texts are normalised (lowercase, no punctuation, single spaces) and split
 * into words. A token-level edit distance lines the two up, so we can tell the
 * player which words were correct, wrong, missing or extra.
 *
 * accuracy = correct words / (words in verse + extra words typed)
 * Extra words are counted so typing a verse twice, or padding an answer, can't
 * reach 100%.
 *
 * Costs are whole numbers: a missing or extra word costs 20; a wrong word costs
 * 20–30, cheaper the more it looks like the right word. So "my good keeper" for
 * "my shepherd" reads as: "good" extra, "keeper" instead of "shepherd".
 */
import type { RecallDiff, RecallScore } from '../../types/games'
import { normaliseText } from '../../utils/textNormalisation'
import { tokeniseVerse } from '../games/verseTokens'

const GAP = 20

/** Similarity of two words, 0–1, from their longest common run of letters (in order). */
function similarity(a: string, b: string): number {
  if (!a.length || !b.length) return 0
  const row = new Array<number>(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    let prev = 0
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j]
      row[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(row[j], row[j - 1])
      prev = temp
    }
  }
  return (2 * row[b.length]) / (a.length + b.length)
}

function substitutionCost(a: string, b: string): number {
  return GAP + Math.round(10 * (1 - similarity(a, b)))
}

export function scoreRecall(verseText: string, attempt: string): RecallScore {
  // Expected words keep their printed form for feedback ("shepherd;"), compared normalised.
  const expected = tokeniseVerse(verseText)
  const actual = normaliseText(attempt).split(' ').filter(Boolean)
  const n = expected.length
  const m = actual.length

  // cost[i][j] = edits to turn expected[i..] into actual[j..]
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n; i >= 0; i--) {
    for (let j = m; j >= 0; j--) {
      if (i === n) cost[i][j] = (m - j) * GAP
      else if (j === m) cost[i][j] = (n - i) * GAP
      else {
        const same = expected[i].normalised === actual[j]
        cost[i][j] = Math.min(
          cost[i + 1][j + 1] + (same ? 0 : substitutionCost(expected[i].normalised, actual[j])), // match or wrong word
          cost[i + 1][j] + GAP, // missing word
          cost[i][j + 1] + GAP, // extra word
        )
      }
    }
  }

  // Walk the table, preferring matches, then substitutions, then missing, then extra.
  const diff: RecallDiff[] = []
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && expected[i].normalised === actual[j] && cost[i][j] === cost[i + 1][j + 1]) {
      diff.push({ type: 'correct', expected: expected[i].text, actual: actual[j] })
      i++, j++
    } else if (i < n && j < m && cost[i][j] === cost[i + 1][j + 1] + substitutionCost(expected[i].normalised, actual[j])) {
      diff.push({ type: 'wrong', expected: expected[i].text, actual: actual[j] })
      i++, j++
    } else if (i < n && (j === m || cost[i][j] === cost[i + 1][j] + GAP)) {
      diff.push({ type: 'missing', expected: expected[i].text })
      i++
    } else {
      diff.push({ type: 'extra', actual: actual[j] })
      j++
    }
  }

  const count = (type: RecallDiff['type']) => diff.filter((d) => d.type === type).length
  const correctWords = count('correct')
  const extraWords = count('extra')
  const denominator = n + extraWords
  return {
    accuracy: denominator === 0 ? 0 : correctWords / denominator,
    correctWords,
    totalWords: n,
    missingWords: count('missing'),
    wrongWords: count('wrong'),
    extraWords,
    diff,
  }
}

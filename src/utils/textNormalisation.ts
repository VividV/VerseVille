/**
 * Text normalisation shared by search and (from Phase 3) recall scoring.
 * - lowercase
 * - fold accents and ligatures ("Judæa" -> "judaea")
 * - treat curly apostrophes as straight ones, then drop apostrophes ("LORD’s" -> "lords")
 * - replace all other punctuation with spaces
 * - collapse repeated spaces and trim
 */
export function normaliseText(input: string): string {
  return input
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // remove accent marks
    .replace(/[’‘'`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

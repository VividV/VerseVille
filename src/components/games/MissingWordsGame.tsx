import { useState } from 'react'
import type { Scripture } from '../../types/scripture'
import type { GameDetails } from '../../types/games'
import {
  applyMissingWordsHint,
  createMissingWordsPuzzle,
  initialMissingWordsState,
  isMissingWordsComplete,
  missingWordsCorrectFirstTry,
  placeTile,
  selectBlank,
} from '../../engine/games/missingWords'
import { assistedAccuracy } from '../../engine/games/gameRules'
import { Button } from '../common/Button'
import { WordTileButton } from './WordTileButton'

export interface GameFinish {
  accuracy: number
  details: GameDetails
}

export function MissingWordsGame({
  scripture,
  distractorPool,
  onFinish,
}: {
  scripture: Scripture
  distractorPool: string[]
  onFinish: (result: GameFinish) => void
}) {
  const newPuzzle = () => createMissingWordsPuzzle(scripture.text, distractorPool, Math.random)
  const [puzzle, setPuzzle] = useState(newPuzzle)
  const [state, setState] = useState(() => initialMissingWordsState(puzzle))
  const [shakeTileId, setShakeTileId] = useState<string | null>(null)
  const [message, setMessage] = useState('Choose the word that fits the highlighted blank.')

  const usedTiles = new Set(Object.values(state.filled))
  const complete = isMissingWordsComplete(puzzle, state)
  const blankNumber = (index: number) => puzzle.blankIndexes.indexOf(index) + 1

  const chooseTile = (tileId: string) => {
    const { state: next, result } = placeTile(puzzle, state, tileId)
    setState(next)
    if (result === 'wrong') {
      setShakeTileId(null)
      requestAnimationFrame(() => setShakeTileId(tileId))
      setMessage('Not quite — try another word.')
    } else if (result === 'correct') {
      setMessage(isMissingWordsComplete(puzzle, next) ? 'Every blank is filled. Well done!' : 'Yes! Next blank.')
    }
  }

  /** Retry: a fresh set of blanks. Nothing is lost by retrying. */
  const retry = () => {
    const next = newPuzzle()
    setPuzzle(next)
    setState(initialMissingWordsState(next))
    setMessage('A fresh set of blanks. Take your time.')
  }

  const finish = () => {
    const correctFirstTry = missingWordsCorrectFirstTry(puzzle, state)
    const totalItems = puzzle.blankIndexes.length
    onFinish({
      accuracy: assistedAccuracy(correctFirstTry, totalItems),
      details: { kind: 'assisted', totalItems, correctFirstTry, hintsUsed: state.hintsUsed, mistakes: state.mistakes },
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-card bg-cream p-5 text-[1.3rem] leading-[2.4] font-semibold text-ink shadow-soft">
        {puzzle.tokens.map((token) => {
          const isBlank = puzzle.blankIndexes.includes(token.index)
          if (!isBlank) return <span key={token.id}>{token.text} </span>
          const tileId = state.filled[token.index]
          const active = state.activeBlank === token.index
          return (
            <span key={token.id}>
              {token.prefix}
              {tileId ? (
                <span className="rounded-lg bg-leaf-light px-1.5 text-leaf-dark">{token.word}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setState(selectBlank(puzzle, state, token.index))}
                  aria-label={`Blank ${blankNumber(token.index)} of ${puzzle.blankIndexes.length}${active ? ', selected' : ''}`}
                  aria-pressed={active}
                  className={[
                    'inline-block min-h-10 min-w-20 rounded-lg border-b-4 align-middle transition',
                    active ? 'border-gold bg-gold/25' : 'border-leaf/50 bg-leaf-light/50',
                  ].join(' ')}
                />
              )}
              {token.suffix}{' '}
            </span>
          )
        })}
      </p>

      <p role="status" aria-live="polite" className="text-center font-bold text-ink-soft">
        {message}
      </p>

      {!complete && (
        <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Word choices">
          {puzzle.tiles.map((tile) => (
            <WordTileButton
              key={tile.id}
              disabled={usedTiles.has(tile.id)}
              tone={state.hintTileId === tile.id ? 'hint' : 'default'}
              className={shakeTileId === tile.id ? 'animate-shake' : ''}
              onClick={() => chooseTile(tile.id)}
            >
              {tile.label}
            </WordTileButton>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        {complete ? (
          <Button size="lg" fullWidth onClick={finish}>
            Finish
          </Button>
        ) : (
          <>
            <Button variant="secondary" fullWidth onClick={() => setState(applyMissingWordsHint(puzzle, state))}>
              <span aria-hidden="true">💡</span> Hint
            </Button>
            <Button variant="ghost" fullWidth onClick={retry}>
              <span aria-hidden="true">↻</span> Retry
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

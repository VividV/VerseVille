import { useMemo, useState } from 'react'
import type { Scripture } from '../../types/scripture'
import {
  applyWordOrderHint,
  checkPositions,
  checkWordOrder,
  createWordOrderPuzzle,
  initialWordOrderState,
  isAnswerFull,
  isWordOrderSolved,
  moveToAnswer,
  moveToPool,
  moveWithinAnswer,
  resetWordOrder,
  returnWrongTiles,
  undo,
  type WordOrderState,
} from '../../engine/games/wordOrder'
import { assistedAccuracy } from '../../engine/games/gameRules'
import { Button } from '../common/Button'
import { WordTileButton } from './WordTileButton'
import { useTileDrag, type DropInfo } from './useTileDrag'
import type { GameFinish } from './MissingWordsGame'
import { playSound } from '../../services/audio/soundService'

export function WordOrderGame({ scripture, onFinish }: { scripture: Scripture; onFinish: (result: GameFinish) => void }) {
  const [puzzle] = useState(() => createWordOrderPuzzle(scripture.text, Math.random))
  const [state, setState] = useState(() => initialWordOrderState(puzzle))
  const label = (id: string) => puzzle.tokens[Number(id.slice(1))].text

  /** Every change goes through here: a full answer line is checked automatically. */
  const update = (next: WordOrderState) => {
    const changed = next.answer !== state.answer
    if (changed && isAnswerFull(puzzle, next)) {
      const checked = checkWordOrder(puzzle, next)
      playSound(isWordOrderSolved(puzzle, checked) ? 'complete' : 'wrong')
      setState(checked)
    } else {
      if (changed) playSound('tap')
      setState(next)
    }
  }

  const { ghost, startDrag, tap } = useTileDrag((drop: DropInfo) => {
    if (drop.zone === 'pool' && drop.source === 'answer') update(moveToPool(state, drop.tileId))
    if (drop.zone === 'answer' && drop.source === 'pool') update(moveToAnswer(state, drop.tileId, drop.insertAt))
    if (drop.zone === 'answer' && drop.source === 'answer')
      update(moveWithinAnswer(state, drop.tileId, drop.insertAt ?? state.answer.length))
  })

  const full = isAnswerFull(puzzle, state)
  const solved = isWordOrderSolved(puzzle, state)
  const positions = useMemo(() => checkPositions(puzzle, state.answer), [puzzle, state.answer])

  const finish = () => {
    const totalItems = puzzle.tokens.length
    const correctFirstTry = state.correctAtFirstCheck ?? 0
    onFinish({
      accuracy: assistedAccuracy(correctFirstTry, totalItems),
      details: { kind: 'assisted', totalItems, correctFirstTry, hintsUsed: state.hintsUsed, mistakes: state.mistakes },
    })
  }

  let message = 'Tap the words in order, or drag them into place.'
  if (solved) message = 'Perfect order. Well done!'
  else if (full) message = 'Some words are out of place. The red ones need to move.'

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-label="Your verse"
        data-drop-zone="answer"
        className="min-h-32 rounded-card bg-cream p-3 shadow-soft"
      >
        {state.answer.length === 0 ? (
          <p className="p-6 text-center text-ink-soft">Your verse will appear here.</p>
        ) : (
          <ol className="flex flex-wrap gap-2">
            {state.answer.map((id, i) => {
              const tone = solved ? 'correct' : full && !positions[i] ? 'wrong' : 'placed'
              return (
                <li key={id} data-answer-index={i}>
                  <WordTileButton
                    tone={tone}
                    aria-label={`${label(id)}, position ${i + 1}${tone === 'wrong' ? ', out of place' : ''}. Tap to remove.`}
                    disabled={solved}
                    style={{ touchAction: 'none', opacity: ghost?.tileId === id ? 0.3 : undefined }}
                    onPointerDown={startDrag(id, label(id), 'answer')}
                    onClick={tap(() => update(moveToPool(state, id)))}
                  >
                    {label(id)}
                  </WordTileButton>
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <p role="status" aria-live="polite" className="text-center font-bold text-ink-soft">
        {message}
      </p>

      {!solved && (
        <section aria-label="Word tiles" data-drop-zone="pool" className="min-h-16 rounded-card p-1">
          <ul className="flex flex-wrap justify-center gap-2">
            {state.pool.map((id) => (
              <li key={id}>
                <WordTileButton
                  style={{ touchAction: 'none', opacity: ghost?.tileId === id ? 0.3 : undefined }}
                  onPointerDown={startDrag(id, label(id), 'pool')}
                  onClick={tap(() => update(moveToAnswer(state, id)))}
                >
                  {label(id)}
                </WordTileButton>
              </li>
            ))}
          </ul>
        </section>
      )}

      {solved ? (
        <Button size="lg" fullWidth onClick={finish}>
          Finish
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {full && (
            <Button className="col-span-2" onClick={() => update(returnWrongTiles(puzzle, state))}>
              Move the red words back
            </Button>
          )}
          <Button variant="secondary" onClick={() => update(applyWordOrderHint(puzzle, state))}>
            <span aria-hidden="true">💡</span> Hint
          </Button>
          <Button variant="secondary" onClick={() => setState(undo(state))} disabled={state.history.length === 0}>
            <span aria-hidden="true">↶</span> Undo
          </Button>
          <Button
            variant="ghost"
            className="col-span-2"
            onClick={() => update(resetWordOrder(puzzle, state))}
            disabled={state.answer.length === 0}
          >
            <span aria-hidden="true">↻</span> Reset
          </Button>
        </div>
      )}

      {ghost && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-gold px-3 py-1.5 text-lg font-bold text-ink shadow-lg"
          style={{ left: ghost.x, top: ghost.y }}
        >
          {ghost.label}
        </div>
      )}
    </div>
  )
}

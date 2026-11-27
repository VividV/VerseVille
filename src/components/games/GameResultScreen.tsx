import type { GameSession } from '../../types/games'
import type { Scripture } from '../../types/scripture'
import { BAND_MESSAGES, GAME_INFO, accuracyBand, toPercent } from '../../engine/games/gameRules'
import { ScriptureText } from '../scripture/ScriptureText'
import { RecallFeedback } from './RecallFeedback'

/** Body of the completion screen: accuracy, encouragement and feedback. */
export function GameResultScreen({ session, scripture }: { session: GameSession; scripture: Scripture }) {
  const percent = toPercent(session.accuracy)
  const band = BAND_MESSAGES[accuracyBand(session.accuracy)]
  const details = session.details

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-2 rounded-card bg-cream p-6 text-center shadow-soft animate-pop-in">
        <p className="text-sm font-bold text-ink-soft">
          {GAME_INFO[session.gameType].icon} {GAME_INFO[session.gameType].name} · {scripture.reference}
        </p>
        <div
          className="flex h-32 w-32 flex-col items-center justify-center rounded-full"
          style={{ background: `conic-gradient(var(--color-leaf) ${percent * 3.6}deg, var(--color-leaf-light) 0deg)` }}
        >
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-cream">
            <span className="text-3xl font-extrabold text-leaf-dark">{percent}%</span>
            <span className="text-xs font-bold text-ink-soft">accuracy</span>
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-leaf-dark">{band.title}</h1>
        <p className="text-ink-soft">{band.message}</p>
        {details.kind === 'assisted' && (
          <p className="text-sm text-ink-soft">
            {details.correctFirstTry} of {details.totalItems} right first time
            {details.hintsUsed > 0 && ` · ${details.hintsUsed} ${details.hintsUsed === 1 ? 'hint' : 'hints'}`}
          </p>
        )}
        {details.kind === 'recall' && (
          <p className="text-sm text-ink-soft">
            {details.score.correctWords} of {details.score.totalWords} words correct
          </p>
        )}
      </div>

      {details.kind === 'recall' && <RecallFeedback score={details.score} />}

      <ScriptureText scripture={scripture} />
    </div>
  )
}

import { VerseRecallGame } from '../components/games/VerseRecallGame'
import { GameScreenFrame } from './GameScreenFrame'

export function VerseRecallScreen() {
  return (
    <GameScreenFrame gameType="recall">
      {(scripture, onFinish) => <VerseRecallGame key={scripture.id} scripture={scripture} onFinish={onFinish} />}
    </GameScreenFrame>
  )
}

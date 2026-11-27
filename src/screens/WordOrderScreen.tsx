import { WordOrderGame } from '../components/games/WordOrderGame'
import { GameScreenFrame } from './GameScreenFrame'

export function WordOrderScreen() {
  return (
    <GameScreenFrame gameType="word-order">
      {(scripture, onFinish) => <WordOrderGame key={scripture.id} scripture={scripture} onFinish={onFinish} />}
    </GameScreenFrame>
  )
}

import { useMemo } from 'react'
import { MissingWordsGame } from '../components/games/MissingWordsGame'
import { getDistractorWords } from '../engine/scripture/scriptureCatalog'
import { useSettingsStore } from '../store/settingsStore'
import { GameScreenFrame } from './GameScreenFrame'
import type { Scripture } from '../types/scripture'
import type { GameFinish } from '../components/games/MissingWordsGame'

function Game({ scripture, onFinish }: { scripture: Scripture; onFinish: (r: GameFinish) => void }) {
  const translation = useSettingsStore((s) => s.settings.preferredTranslation)
  const pool = useMemo(() => getDistractorWords(scripture.id, translation), [scripture.id, translation])
  return <MissingWordsGame key={scripture.id} scripture={scripture} distractorPool={pool} onFinish={onFinish} />
}

export function MissingWordsScreen() {
  return (
    <GameScreenFrame gameType="missing-words">
      {(scripture, onFinish) => <Game scripture={scripture} onFinish={onFinish} />}
    </GameScreenFrame>
  )
}

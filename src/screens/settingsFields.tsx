/** Form fields shared by onboarding and the profile/settings screen. */
import type { DailyGoal, TranslationCode } from '../types/player'

export const DAILY_GOAL_OPTIONS: DailyGoal[] = [1, 3, 5]

export const TRANSLATION_OPTIONS: { code: TranslationCode; name: string }[] = [
  { code: 'KJV', name: 'King James Version (KJV)' },
]

export function TranslationPicker({
  value,
  onChange,
}: {
  value: TranslationCode
  onChange: (value: TranslationCode) => void
}) {
  return (
    <div>
      <label htmlFor="translation" className="block text-lg font-bold text-leaf-dark">
        Bible translation
      </label>
      <select
        id="translation"
        value={value}
        onChange={(e) => onChange(e.target.value as TranslationCode)}
        className="mt-2 min-h-12 w-full rounded-2xl border-2 border-leaf-light bg-white px-4 text-lg focus:border-leaf focus:outline-none"
      >
        {TRANSLATION_OPTIONS.map((t) => (
          <option key={t.code} value={t.code}>
            {t.name}
          </option>
        ))}
      </select>
      <p className="mt-2 text-sm text-ink-soft">More translations will be added once permissions are confirmed.</p>
    </div>
  )
}

export function DailyGoalPicker({ value, onChange }: { value: DailyGoal; onChange: (value: DailyGoal) => void }) {
  return (
    <fieldset>
      <legend className="text-lg font-bold text-leaf-dark">Daily scripture goal</legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {DAILY_GOAL_OPTIONS.map((goal) => {
          const selected = value === goal
          return (
            <label
              key={goal}
              className={[
                'flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 font-bold transition',
                'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold',
                selected ? 'border-leaf bg-leaf-light text-leaf-dark' : 'border-leaf-light bg-white text-ink-soft',
              ].join(' ')}
            >
              <input
                type="radio"
                name="dailyGoal"
                value={goal}
                checked={selected}
                onChange={() => onChange(goal)}
                className="sr-only"
              />
              <span className="text-xl">{goal}</span>
              <span className="text-xs">{goal === 1 ? 'scripture' : 'scriptures'}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

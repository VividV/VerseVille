/** Bible translations the app can show. Only public-domain texts for the MVP. */
export type TranslationCode = 'KJV'

export type DailyGoal = 1 | 3 | 5

export interface PlayerProfile {
  id: string
  displayName: string
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
}

export interface PlayerResources {
  coins: number
  seeds: number
  gems: number
  xp: number
  level: number
  updatedAt: string
}

export type TextSize = 'normal' | 'large' | 'extra-large'

export interface PlayerSettings {
  preferredTranslation: TranslationCode
  dailyGoal: DailyGoal
  soundEnabled: boolean
  notificationsEnabled: boolean
  textSize: TextSize
  highContrast: boolean
  reducedMotion: boolean
  /** When settings last changed (used to merge devices). Missing on old saves. */
  updatedAt?: string
}

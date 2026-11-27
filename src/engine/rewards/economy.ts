import type { PlayerResources } from '../../types/player'

/** Resources given to every new player (spec §13.1). */
export const STARTING_RESOURCES: Omit<PlayerResources, 'updatedAt'> = {
  coins: 100,
  seeds: 5,
  gems: 0,
  xp: 0,
  level: 1,
}

// Mirrors fantasy-core-pipeline's to_nflverse_team: ESPN's code where it differs from the live
// games' code, then the older abbreviations nflverse datasets still use.
const NFLVERSE_CODE_BY_ALIAS: Record<string, string> = {
  WSH: 'WAS',
  LA: 'LAR', STL: 'LAR',
  OAK: 'LV', LVR: 'LV',
  SD: 'LAC',
  ARZ: 'ARI',
  BLT: 'BAL',
  CLV: 'CLE',
  HST: 'HOU',
}

/** An NFL team code as the live game's `home_abbr` and `away_abbr` spell it. */
export function toNflverseTeam(team: string): string {
  return NFLVERSE_CODE_BY_ALIAS[team] ?? team
}

import type { DraftConfig } from '../api/types'

export const CONFIG_STORAGE_KEY = 'fantasy-web-ui.draft-config'

// Dev-only convenience so local `npm run dev` doesn't require manual config
// entry every reload; import.meta.env.DEV keeps this out of production builds.
const DEV_DEFAULTS = import.meta.env.DEV
  ? { league_id: '1248158344', team_id: '8' }
  : { league_id: '', team_id: '' }

export function loadStoredConfig(): DraftConfig {
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DraftConfig>
      return {
        league_id: parsed.league_id ?? DEV_DEFAULTS.league_id,
        team_id: parsed.team_id ?? DEV_DEFAULTS.team_id,
        season: parsed.season ?? new Date().getFullYear(),
        mode: parsed.mode ?? 'live',
      }
    }
  } catch {
    // Corrupt/absent storage - fall through to defaults.
  }
  return {
    league_id: DEV_DEFAULTS.league_id,
    team_id: DEV_DEFAULTS.team_id,
    season: new Date().getFullYear(),
    mode: 'live',
  }
}

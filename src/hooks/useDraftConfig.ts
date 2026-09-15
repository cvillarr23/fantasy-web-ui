import type { DraftConfig } from '../api/types'

export const CONFIG_STORAGE_KEY = 'fantasy-web-ui.draft-config'

export function loadStoredConfig(): DraftConfig {
  try {
    const raw = window.localStorage.getItem(CONFIG_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DraftConfig>
      return {
        league_id: parsed.league_id ?? '',
        team_id: parsed.team_id ?? '',
        season: parsed.season ?? new Date().getFullYear(),
        mode: parsed.mode ?? 'live',
      }
    }
  } catch {
    // Corrupt/absent storage - fall through to defaults.
  }
  return { league_id: '', team_id: '', season: new Date().getFullYear(), mode: 'live' }
}

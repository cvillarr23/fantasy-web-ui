import { createContext, useContext } from 'react'
import { setDraftConfig } from '../api/client'
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

export function saveStoredConfig(config: DraftConfig) {
  try {
    window.localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Storage blocked - the server copy is still authoritative.
  }
}

export interface DraftConfigContextValue {
  config: DraftConfig
  // True until the server copy has been fetched (or failed), so pages can avoid flashing
  // "not configured" on a fresh device whose localStorage cache is still empty.
  loading: boolean
  saveConfig: (config: DraftConfig) => Promise<void>
  // For callers (ConfigScreen) that already POSTed the config themselves.
  setConfig: (config: DraftConfig) => void
}

export const DraftConfigContext = createContext<DraftConfigContextValue | null>(null)

// Falls back to the localStorage cache outside a provider so components rendered standalone
// (tests) keep working.
export function useDraftConfig(): DraftConfigContextValue {
  const ctx = useContext(DraftConfigContext)
  if (ctx) return ctx
  const config = loadStoredConfig()
  return {
    config,
    loading: false,
    saveConfig: async (next) => { await setDraftConfig(next); saveStoredConfig(next) },
    setConfig: saveStoredConfig,
  }
}

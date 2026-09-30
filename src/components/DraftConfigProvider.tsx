import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, getDraftConfig, setDraftConfig } from '../api/client'
import type { DraftConfig } from '../api/types'
import { DraftConfigContext, loadStoredConfig, saveStoredConfig } from '../hooks/useDraftConfig'

// Holds the league/team settings for the whole app. Starts from the localStorage cache so a
// returning browser renders immediately, then replaces it with the server copy so every
// browser/device converges on whatever was saved last.
export function DraftConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<DraftConfig>(loadStoredConfig)
  const [loading, setLoading] = useState(true)

  const setConfig = useCallback((next: DraftConfig) => {
    saveStoredConfig(next)
    setConfigState(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    getDraftConfig()
      .then((server) => {
        if (!cancelled) setConfig({ ...server, mode: 'live' })
      })
      .catch((err) => {
        if (cancelled) return
        // Nothing on the server yet but this browser has a config from before settings were
        // server-side: push it up once so other devices pick it up.
        const local = loadStoredConfig()
        if (err instanceof ApiError && err.status === 404 && local.league_id && local.team_id) {
          void setDraftConfig(local).catch(() => {})
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [setConfig])

  const saveConfig = useCallback(async (next: DraftConfig) => {
    await setDraftConfig(next)
    setConfig(next)
  }, [setConfig])

  const value = useMemo(() => ({ config, loading, saveConfig, setConfig }), [config, loading, saveConfig, setConfig])
  return <DraftConfigContext.Provider value={value}>{children}</DraftConfigContext.Provider>
}

import { useEffect, useState } from 'react'
import { getTeamNames } from '../api/client'

// Module-level, not per-instance like usePlayerDetailsCache: team names are shared,
// read-only, and used by up to 5 components on the same page (RosterDeficitsGrid,
// PickFeed, StatusHeader, TeamComparisonPanel, TeamPositionGrid) - without this, each
// would fire its own independent GET /v1/league/teams on mount.
let cache: Record<string, string> | null = null
let inFlight: Promise<Record<string, string>> | null = null

/** team_id -> real ESPN team name. Empty object until the shared fetch resolves; callers
 * should fall back to a placeholder (e.g. `Team ${id}`) for any id not yet in the map. */
export function useTeamNames(): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>(() => cache ?? {})

  useEffect(() => {
    if (cache) return
    let cancelled = false
    if (!inFlight) {
      inFlight = getTeamNames().catch(() => ({}))
    }
    inFlight.then((result) => {
      cache = result
      if (!cancelled) setNames(result)
    })
    return () => { cancelled = true }
  }, [])

  return names
}

import { useEffect, useState } from 'react'
import { getCurrentWeek } from '../api/client'

let cache: number | null = null
let inFlight: Promise<number | null> | null = null

/** Current NFL week (nflreadpy-backed, see resolve_default_week() in the pipeline), for
 * seeding the week field on Lineup/Matchup pages. Returns null until resolved - callers
 * should only use it to set an initial default, not overwrite what the user has typed. */
export function useCurrentWeek(): number | null {
  const [week, setWeek] = useState<number | null>(cache)

  useEffect(() => {
    if (cache !== null) return
    let cancelled = false
    if (!inFlight) {
      inFlight = getCurrentWeek().then((r) => r.week).catch(() => null)
    }
    inFlight.then((result) => {
      cache = result
      if (!cancelled) setWeek(result)
    })
    return () => { cancelled = true }
  }, [])

  return week
}

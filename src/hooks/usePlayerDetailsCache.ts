import { useEffect, useMemo, useState } from 'react'
import { getPlayerSummary } from '../api/client'

export interface PlayerDetails {
  name: string
  team: string
  position: string
}

/** Batch-fetches player details for any playerId not already cached, and caches the result
 * for the lifetime of this hook instance. Extracted from PickFeed so TeamComparisonPanel can
 * share the same fetch/cache behavior instead of duplicating the effect. */
export function usePlayerDetailsCache(playerIds: (string | null)[]): Record<string, PlayerDetails> {
  const [playerDetailsById, setPlayerDetailsById] = useState<Record<string, PlayerDetails>>({})
  const missingPlayerDetails = useMemo(
    () => [...new Set(playerIds.filter((id): id is string => Boolean(id)))]
      .filter((playerId) => !playerDetailsById[playerId]),
    [playerIds, playerDetailsById],
  )

  useEffect(() => {
    if (missingPlayerDetails.length === 0) return
    let cancelled = false

    void Promise.all(
      missingPlayerDetails.map(async (playerId) => {
        try {
          const summary = await getPlayerSummary(playerId)
          return [playerId, { name: summary.name, team: summary.team, position: summary.position }] as const
        } catch {
          return null
        }
      }),
    ).then((results) => {
      if (cancelled) return
      const nextDetails: Record<string, PlayerDetails> = {}
      for (const result of results) {
        if (!result) continue
        nextDetails[result[0]] = result[1]
      }
      if (Object.keys(nextDetails).length > 0) {
        setPlayerDetailsById((current) => ({ ...current, ...nextDetails }))
      }
    })

    return () => {
      cancelled = true
    }
  }, [missingPlayerDetails])

  return playerDetailsById
}

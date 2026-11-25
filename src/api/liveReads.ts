import { queryOptions } from '@tanstack/react-query'
import { getLivePlayers } from './client'
import type { LivePlayersResponse } from './types'

export const LIVE_REFETCH_MS = 30_000

function anyInProgress(data: LivePlayersResponse | undefined): boolean {
  return Object.values(data?.players ?? {}).some((block) => block?.status === 'in_progress')
}

/** Poll every 30s only while a player on screen is mid-game, and never in a hidden tab. */
export function liveRefetchInterval(data: LivePlayersResponse | undefined, hidden = document.hidden): number | false {
  return anyInProgress(data) && !hidden ? LIVE_REFETCH_MS : false
}

/** Live snapshots for the players on a page that doesn't get a `live` block with its own read. */
export function livePlayersQuery(playerIds: string[]) {
  const ids = [...new Set(playerIds)].sort()
  return queryOptions({
    queryKey: ['live-players', ids],
    queryFn: () => getLivePlayers(ids),
    enabled: ids.length > 0,
    refetchInterval: (query) => liveRefetchInterval(query.state.data),
    refetchIntervalInBackground: false,
  })
}

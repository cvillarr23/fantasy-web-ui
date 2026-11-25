import { useQuery } from '@tanstack/react-query'
import { livePlayersQuery } from '../api/liveReads'
import { queryClient } from '../api/queryClient'
import type { LiveBlock } from '../api/types'

/** Live snapshots keyed by player id for the players on screen. */
export function useLivePlayers(playerIds: string[]): Record<string, LiveBlock | null> {
  const query = useQuery(livePlayersQuery(playerIds), queryClient)
  return query.data?.players ?? {}
}

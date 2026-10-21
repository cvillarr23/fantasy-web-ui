import { useQuery } from '@tanstack/react-query'
import { getOutgoingTradeOffers } from '../api/client'
import { queryClient } from '../api/queryClient'
import type { DraftConfig } from '../api/types'

export function useOutgoingTradeOffers(config: DraftConfig) {
  return useQuery({
    queryKey: ['outgoing-trade-proposals', config.league_id, config.team_id, config.season],
    queryFn: () => getOutgoingTradeOffers(config),
    enabled: Boolean(config.league_id && config.team_id),
    staleTime: 30_000,
  }, queryClient)
}

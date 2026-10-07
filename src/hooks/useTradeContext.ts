import { useQuery } from '@tanstack/react-query'
import { getTradeContext } from '../api/client'
import { queryClient } from '../api/queryClient'
import type { DraftConfig } from '../api/types'
import { validWeek } from './useSelectedWeek'

export function useTradeContext(config: DraftConfig, week: number | string, horizon: number) {
  const selectedWeek = validWeek(week)
  return useQuery({
    queryKey: ['league-trade-context', config.league_id, config.season, selectedWeek, horizon],
    queryFn: ({ signal }) => getTradeContext(config.league_id, config.season, selectedWeek!, horizon, signal),
    enabled: /^[1-9]\d*$/.test(config.league_id) && Number.isInteger(config.season)
      && config.season >= 2000 && config.season <= 2100 && selectedWeek !== null,
    staleTime: 60_000,
  }, queryClient)
}

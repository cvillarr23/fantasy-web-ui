import { useDraftConfig } from './useDraftConfig'
import { useQuery } from '@tanstack/react-query'
import { getCurrentWeek } from '../api/client'
import { queryClient } from '../api/queryClient'
export function useCurrentWeek(): number | null {
  const { config } = useDraftConfig()
  const query = useQuery(
    {
      queryKey: ['current-week', config.league_id, config.season],
      queryFn: () => getCurrentWeek(config.season),
      staleTime: 300_000,
      refetchInterval: 300_000,
    },
    queryClient,
  )
  const week = query.data?.week
  return week && Number.isInteger(week) && week >= 1 && week <= 18 ? week : null
}

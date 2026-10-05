import { useQuery } from '@tanstack/react-query'
import { getTeamNames } from '../api/client'
import { queryClient } from '../api/queryClient'
export function useTeamNames(): Record<string, string> {
  return (
    useQuery({ queryKey: ['team-names'], queryFn: getTeamNames, staleTime: 900_000 }, queryClient)
      .data ?? {}
  )
}

import { queryOptions } from '@tanstack/react-query'
import { ApiError, getScoringRules } from './client'

export function scoringRulesQuery(season: number) {
  return queryOptions({
    queryKey: ['scoring-rules', season],
    // A 404 means the season's league settings aren't synced yet. That is a stable answer,
    // so cache it as null instead of an error.
    queryFn: () =>
      getScoringRules(season).catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) return null
        throw err
      }),
    // League rules only change when the commissioner edits them.
    staleTime: 10 * 60 * 1000,
  })
}

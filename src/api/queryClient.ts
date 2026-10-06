import { QueryClient } from '@tanstack/react-query'
import type { DraftConfig } from './types'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Revisiting a page within this window renders cached data with no request; after it,
      // cached data still renders immediately while a background refetch runs.
      staleTime: 2 * 60_000,
      gcTime: 15 * 60_000,
      retry: (attempt, error) =>
        attempt < 2 &&
        !('status' in error && Number(error.status) >= 400 && Number(error.status) < 500),
      refetchOnWindowFocus: true,
    },
    mutations: { retry: false },
  },
})
let scope = 'unconfigured'
export function scopeFor(config: Pick<DraftConfig, 'league_id' | 'team_id' | 'season'>) {
  return `${config.league_id}:${config.team_id}:${config.season}`
}
/** Clears every cached read when the league, team or season changes. Seed it with the
 * locally stored config at startup so the server copy arriving with the same values keeps
 * the reads already in flight. */
export function setQueryScope(next: string) {
  if (next !== scope) {
    queryClient.clear()
    scope = next
  }
}
export function cacheKey(path: string) {
  return [scope, path]
}
export function invalidateRoster() {
  return queryClient.invalidateQueries({
    predicate: (q) => /roster|matchup|scoreboard|waiver|move-preview|league/.test(q.queryKey.join(':')),
  })
}

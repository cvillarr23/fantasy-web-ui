import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
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
export function setQueryScope(next: string) {
  if (next !== scope) {
    queryClient.clear()
    scope = next
  }
}
export function cacheKey(path: string) {
  return [scope, path]
}
export function readFreshness(path: string) {
  if (/draft\/(status|logs)|activity/.test(path)) return 0
  if (/league\/teams|draft\/config/.test(path)) return 900_000
  if (/current-week|players\//.test(path)) return 300_000
  if (/stats|waiver|deficits/.test(path)) return 60_000
  if (/backtest/.test(path)) return 900_000
  return 30_000
}
export function invalidateRoster() {
  return queryClient.invalidateQueries({
    predicate: (q) => /roster|matchup|waiver|move-preview|league/.test(q.queryKey.join(':')),
  })
}

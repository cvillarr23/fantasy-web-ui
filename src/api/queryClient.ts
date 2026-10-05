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
export function invalidateRoster() {
  return queryClient.invalidateQueries({
    predicate: (q) => /roster|matchup|waiver|move-preview|league/.test(q.queryKey.join(':')),
  })
}

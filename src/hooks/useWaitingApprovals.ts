import { useQuery } from '@tanstack/react-query'
import { getWaitingApprovals, WAITING_APPROVALS_LIMIT } from '../api/runs'
import { WAITING_APPROVALS_KEY } from './jobQueries'

const POLL_MS = 30_000

/** The approvals waiting for a person, counted from one page of the run list. A full page means
 * there may be more, so the count says "100+" rather than a number that could be wrong. */
export function waitingCount(items: unknown[] | undefined) {
  if (!items) return undefined
  return items.length >= WAITING_APPROVALS_LIMIT ? `${WAITING_APPROVALS_LIMIT}+` : String(items.length)
}

export function useWaitingApprovals() {
  return useQuery({
    queryKey: WAITING_APPROVALS_KEY,
    queryFn: () => getWaitingApprovals().then((page) => page.items),
    refetchInterval: POLL_MS,
  })
}

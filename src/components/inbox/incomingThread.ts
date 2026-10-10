import { useQuery } from '@tanstack/react-query'
import { getIncomingThread } from '../../api/tradeInbox'
import { queryClient } from '../../api/queryClient'
import type { DraftConfig } from '../../api/types'
import type { IncomingTrade, NegotiationThread, ThreadState } from '../../api/tradeInboxTypes'
// A thread only has history to show once the offer answers our counter or we countered it.
export function isThreaded(row: IncomingTrade) {
  return Boolean(row.related_transaction_id || row.our_counter)
}
export function useIncomingThread(config: DraftConfig, row: IncomingTrade) {
  return useQuery(
    {
      // last_seen_at moves on every worker refresh, so a refreshed offer re-reads its thread.
      queryKey: ['inbox-thread', config.league_id, row.espn_transaction_id, row.last_seen_at],
      queryFn: () => getIncomingThread(config, row.espn_transaction_id),
      enabled: isThreaded(row),
      staleTime: 60000,
      retry: false,
    },
    queryClient,
  )
}
export const THREAD_STATE_COPY: Record<ThreadState, string> = {
  awaiting_us: 'Your move',
  awaiting_them: 'Waiting on them',
  agreed: 'Agreed',
  rejected: 'Rejected',
  expired: 'Expired',
  abandoned: 'Abandoned',
}
// The worker refuses a counter past the thread's limit, so the button says so up front.
export function counterLimitReason(thread: NegotiationThread | undefined): string | null {
  if (!thread || thread.our_counters < thread.counter_limit) return null
  return `This negotiation already has ${thread.our_counters} counters from you (limit ${thread.counter_limit}). Accept or decline this offer instead.`
}

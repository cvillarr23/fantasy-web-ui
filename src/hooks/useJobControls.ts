import { useMutation, useQueryClient } from '@tanstack/react-query'
import { approveRun, cancelRun, dismissRun, pauseJob, resumeJob, type PauseRequest } from '../api/jobs'
import { refreshApprovalViews, refreshJobViews } from './jobQueries'

/** Cancels a run, then refreshes everything that shows one. A refused cancel refreshes too,
 * because a 409 means the run already ended and this page hasn't caught up. */
export function useCancelRun() {
  const client = useQueryClient()
  return useMutation({ mutationFn: cancelRun, onSettled: () => refreshJobViews(client) })
}

interface Pause {
  name: string
  request: PauseRequest
}

/** Pauses a job or chain, then refreshes the catalog, which carries the pause. */
export function usePauseJob() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ name, request }: Pause) => pauseJob(name, request),
    onSettled: () => refreshJobViews(client),
  })
}

/** Resumes a paused job or chain, then refreshes the catalog. */
export function useResumeJob() {
  const client = useQueryClient()
  return useMutation({ mutationFn: resumeJob, onSettled: () => refreshJobViews(client) })
}

/** Approves a waiting approval run, then refreshes everything that shows it. A refused decision
 * refreshes too, because a 409 means the approval already ended (decided elsewhere, or expired). */
export function useApproveRun() {
  const client = useQueryClient()
  return useMutation({ mutationFn: approveRun, onSettled: () => refreshApprovalViews(client) })
}

/** Dismisses a waiting approval run, refreshing the same views as an approval. */
export function useDismissRun() {
  const client = useQueryClient()
  return useMutation({ mutationFn: dismissRun, onSettled: () => refreshApprovalViews(client) })
}

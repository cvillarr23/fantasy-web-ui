import { useMutation, useQueryClient } from '@tanstack/react-query'
import { startJobRun, type StartRunRequest } from '../api/jobs'
import { refreshJobViews } from './jobQueries'

interface Start {
  job: string
  request: StartRunRequest
}

/** Starts a run, then refreshes everything that shows one. A refused run refreshes too,
 * because a 409 means this page's view of the job is out of date. */
export function useStartJobRun() {
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ job, request }: Start) => startJobRun(job, request),
    onSettled: () => refreshJobViews(client),
  })
  const job = mutation.variables?.job ?? null
  return {
    start: mutation.mutate,
    reset: mutation.reset,
    startingJob: mutation.isPending ? job : null,
    failedJob: mutation.isError ? job : null,
    error: mutation.error,
    started: mutation.data && job ? { job, runId: mutation.data.run_id } : null,
  }
}

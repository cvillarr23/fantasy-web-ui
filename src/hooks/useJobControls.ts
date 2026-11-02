import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelRun, pauseJob, resumeJob, type PauseRequest } from '../api/jobs'
import { refreshJobViews } from './useStartJobRun'

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

/** Pauses and resumes a job or chain. Both refresh the catalog, which carries the pause. */
export function usePauseControls() {
  const client = useQueryClient()
  const onSettled = () => refreshJobViews(client)
  const pause = useMutation({ mutationFn: ({ name, request }: Pause) => pauseJob(name, request), onSettled })
  const resume = useMutation({ mutationFn: resumeJob, onSettled })
  return { pause, resume }
}

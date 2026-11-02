import { Anchor } from '@mantine/core'
import { Link } from 'react-router-dom'
import { ApiError } from '../../api/client'
import type { JobInfo } from '../../api/jobs'
import { ErrorAlert } from '../ui/ErrorAlert'
import { JOBS_LINK_STATE } from './jobsFormat'

const OVERLAP_REFUSED = 409

/** Why a run didn't start. A 409 means another run holds the job, so it links that run. */
export function RunRefusal({ job, error }: { job: JobInfo; error: Error }) {
  if (!(error instanceof ApiError && error.status === OVERLAP_REFUSED)) {
    return <ErrorAlert>Run not started: {error.message}</ErrorAlert>
  }
  return (
    <ErrorAlert title="Run not started">
      {job.name} already has a run in progress, and it allows one at a time.{' '}
      {job.last_run && (
        <Anchor component={Link} to={`/activity/runs/${job.last_run.id}`} state={JOBS_LINK_STATE}>
          Open the active run
        </Anchor>
      )}
    </ErrorAlert>
  )
}

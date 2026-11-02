import { useQuery } from '@tanstack/react-query'
import { Badge } from '@mantine/core'
import { useSearchParams } from 'react-router-dom'
import {
  getJobCatalog,
  getLatestChainRun,
  getLauncherHealth,
  getRecentJobRuns,
  type ChainInfo,
  type JobCatalog,
  type JobInfo,
} from '../api/jobs'
import { getRun } from '../api/runs'
import { CHAIN_RUN_KEY, JOB_CATALOG_KEY, JOB_RUNS_KEY, useStartJobRun } from '../hooks/useStartJobRun'
import { ChainPanel } from './jobs/ChainPanel'
import { JobRunPanel } from './jobs/JobRunPanel'
import { JobsTable } from './jobs/JobsTable'
import { launcherPill, opensRunForm, type LauncherTone } from './jobs/jobsFormat'
import './jobs/jobs.css'
import { isActiveRun } from './runFormat'
import { TableSkeleton } from './skeletons'
import { EmptyState } from './ui/EmptyState'
import { ErrorAlert } from './ui/ErrorAlert'
import { PageHeader } from './ui/PageHeader'

const ACTIVE_POLL_MS = 5000
const IDLE_POLL_MS = 30_000
const RAIL_ID = 'job-rail'
const FAILED_STATUSES = new Set(['failure', 'timeout'])
const LAUNCHER_COLORS: Record<LauncherTone, string> = { healthy: 'teal', warning: 'yellow', unknown: 'gray' }

const hasActiveRun = (catalog?: JobCatalog) => Boolean(catalog?.jobs.some((job) => isActiveRun(job.last_run?.status)))
const pollFor = (active: boolean) => (active ? ACTIVE_POLL_MS : IDLE_POLL_MS)
const countJobs = (catalog: JobCatalog | undefined, matches: (status?: string) => boolean) =>
  catalog?.jobs.filter((job) => matches(job.last_run?.status)).length

function pillText(count: number | undefined, failed: boolean, suffix: string) {
  if (failed && count === undefined) return `${suffix} unavailable`
  return `${count ?? '…'} ${suffix}`
}

function JobsPills({ catalog, failed }: { catalog?: JobCatalog; failed: boolean }) {
  const health = useQuery({ queryKey: ['launcher-health'], queryFn: getLauncherHealth, refetchInterval: IDLE_POLL_MS })
  const launcher = launcherPill(health.data?.heartbeat_age_seconds, health.isError)
  return (
    <div className="jobs-pills">
      <Badge component="a" href="#jobs" variant="light" color="gray">{pillText(catalog?.jobs.length, failed, 'jobs')}</Badge>
      <Badge component="a" href="#jobs" variant="light" color="blue">{pillText(countJobs(catalog, isActiveRun), failed, 'running or queued')}</Badge>
      <Badge component="a" href="#jobs" variant="light" color="red">
        {pillText(countJobs(catalog, (status) => FAILED_STATUSES.has(status ?? '')), failed, 'failed last run')}
      </Badge>
      <Badge variant="light" color={LAUNCHER_COLORS[launcher.tone]}>{launcher.label}</Badge>
    </div>
  )
}

/** The newest run of a chain with its steps, or null if the chain has never run. */
async function latestChainRunDetail(chain: string) {
  const latest = await getLatestChainRun(chain)
  return latest ? getRun(latest.id) : null
}

interface ChainSectionProps {
  chain: ChainInfo
  jobs: JobInfo[]
  selected: string | null
  onSelect: (job: string) => void
}

function ChainSection({ chain, jobs, selected, onSelect }: ChainSectionProps) {
  const root = useQuery({
    queryKey: [CHAIN_RUN_KEY, chain.name],
    queryFn: () => latestChainRunDetail(chain.name),
    refetchInterval: (query) => pollFor(isActiveRun(query.state.data?.status)),
  })
  if (root.isError && !root.data) {
    return (
      <ErrorAlert onRetry={() => void root.refetch()}>
        Could not load the latest {chain.name} run: {root.error.message}
      </ErrorAlert>
    )
  }
  return <ChainPanel chain={chain} jobs={jobs} root={root.data ?? null} selected={selected} onSelect={onSelect} />
}

interface RailProps {
  catalog: JobCatalog
  job: JobInfo | undefined
  run: ReturnType<typeof useStartJobRun>
}

function JobRail({ catalog, job, run }: RailProps) {
  const recent = useQuery({
    queryKey: [JOB_RUNS_KEY, job?.name],
    queryFn: () => getRecentJobRuns(job?.name ?? ''),
    enabled: Boolean(job),
    refetchInterval: pollFor(isActiveRun(job?.last_run?.status)),
  })
  return (
    <aside id={RAIL_ID} aria-label="Selected job" className="job-rail">
      {job ? (
        <JobRunPanel
          key={job.name}
          job={job}
          catalog={catalog}
          recentRuns={recent.data ?? []}
          starting={run.startingJob === job.name}
          error={run.failedJob === job.name ? run.error : null}
          started={run.started?.job === job.name ? run.started : null}
          onStart={(request) => run.start({ job: job.name, request })}
        />
      ) : (
        <EmptyState>Pick a job to set its options, run it and see its recent runs.</EmptyState>
      )}
    </aside>
  )
}

export function JobsPage() {
  const [search, setSearch] = useSearchParams()
  const catalog = useQuery({
    queryKey: JOB_CATALOG_KEY,
    queryFn: getJobCatalog,
    refetchInterval: (query) => pollFor(hasActiveRun(query.state.data)),
  })
  const run = useStartJobRun()
  const selected = search.get('job')
  const select = (job: string) => {
    if (job !== selected) run.reset()
    setSearch({ job }, { replace: true })
    document.getElementById(RAIL_ID)?.scrollIntoView({ block: 'nearest' })
  }
  const onRun = (job: JobInfo) => {
    select(job.name)
    if (!opensRunForm(job, catalog.data?.chains ?? [])) {
      run.start({ job: job.name, request: { params: {}, downstream: false } })
    }
  }
  const data = catalog.data
  const stale = catalog.isError && Boolean(data)
  return (
    <div className="dashboard">
      <PageHeader title="Jobs" subtitle="Start a job, follow its runs and watch the weekly chain." level={1} />
      <JobsPills catalog={data} failed={catalog.isError} />
      {catalog.isError && (
        <ErrorAlert onRetry={() => void catalog.refetch()} mb="md">
          {stale ? `Could not refresh jobs. Showing the last data loaded. ${catalog.error.message}` : `Could not load jobs: ${catalog.error.message}`}
        </ErrorAlert>
      )}
      {catalog.isPending && <TableSkeleton columns={5} label="Loading jobs" />}
      {data?.jobs.length === 0 && <EmptyState tone="alert">No jobs in the catalog. The launcher catalog may not be mounted.</EmptyState>}
      {data && data.jobs.length > 0 && (
        <div className={stale ? 'jobs-stale' : undefined}>
          <div className="jobs-layout">
            <section id="jobs" aria-labelledby="jobs-heading" className="jobs-main job-panel">
              <h2 id="jobs-heading">All jobs</h2>
              <JobsTable catalog={data} selected={selected} startingJob={run.startingJob} onSelect={select} onRun={onRun} />
            </section>
            <JobRail catalog={data} job={data.jobs.find((job) => job.name === selected)} run={run} />
          </div>
          {data.chains.map((chain) => (
            <div key={chain.name} className="jobs-chain">
              <ChainSection chain={chain} jobs={data.jobs} selected={selected} onSelect={select} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

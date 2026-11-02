import type { ChainInfo, JobCatalog, JobInfo, LauncherHealth, LastRun } from '../../api/jobs'
import type { RunDetail } from '../../api/runs'

// Synthetic catalog for tests and stories. The component library is published, so nothing
// here comes from a real league or team.

const CHICAGO = 'America/Chicago'

function lastRun(job_name: string, status: string, started_at: string, finished_at?: string): LastRun {
  return { job_name, id: `run-${job_name}`, status, started_at, finished_at: finished_at ?? null, trigger_type: 'schedule' }
}

export function jobFixture(overrides: Partial<JobInfo> & { name: string }): JobInfo {
  return {
    executor: 'pod',
    overlap: 'forbid',
    max_attempts: 2,
    deadline_seconds: 3600,
    alert: 'warning',
    acts: false,
    params: {},
    profile: 'core',
    command: ['python', '-m', 'sample'],
    schedules: [],
    on_event: [],
    last_run: null,
    next_run_at: null,
    pause: null,
    ...overrides,
  }
}

export const chainFixture: ChainInfo = {
  name: 'sample-weekly',
  schedule: { cron: '0 16 * * 2', tz: CHICAGO, catch_up: 'PT2H', seasons: ['regular'] },
  max_duration_seconds: 28800,
  next_run_at: '2026-11-10T22:00:00Z',
  pause: null,
  steps: {
    'sync-sample': { after: [], latest: null, last_run: null },
    'score-sample': { after: [{ step: 'sync-sample', on: 'success' }], latest: null, last_run: null },
    'refresh-sample': { after: [{ step: 'score-sample', on: 'finish' }], latest: null, last_run: null },
    'set-lineup': { after: [{ step: 'refresh-sample', on: 'finish' }], latest: '19:15', last_run: null },
    'claim-waivers': { after: [{ step: 'set-lineup', on: 'finish' }], latest: '20:30', last_run: null },
  },
}

export const catalogFixture: JobCatalog = {
  chains: [chainFixture],
  jobs: [
    jobFixture({
      name: 'sync-rumors',
      schedules: [{ cron: '*/30 * * * *', tz: CHICAGO }],
      last_run: lastRun('sync-rumors', 'success', '2026-11-03T22:00:04Z', '2026-11-03T22:00:16Z'),
      next_run_at: '2026-11-03T22:30:00Z',
    }),
    jobFixture({
      name: 'check-session',
      schedules: [{ cron: '0 6 * * 1', tz: 'UTC' }],
      last_run: lastRun('check-session', 'failure', '2026-11-02T06:00:02Z', '2026-11-02T06:01:02Z'),
      next_run_at: '2026-11-09T06:00:00Z',
    }),
    jobFixture({
      name: 'sync-sample',
      last_run: lastRun('sync-sample', 'success', '2026-11-03T22:00:01Z', '2026-11-03T22:04:01Z'),
    }),
    jobFixture({
      name: 'score-sample',
      schedules: [{ cron: '0 10 * * 5', tz: CHICAGO }],
      last_run: lastRun('score-sample', 'running', '2026-11-03T22:17:00Z'),
      next_run_at: '2026-11-06T16:00:00Z',
    }),
    jobFixture({ name: 'refresh-sample', schedules: [{ cron: '0 18 * * *', tz: CHICAGO }], next_run_at: '2026-11-05T00:00:00Z' }),
    jobFixture({ name: 'set-lineup', acts: true, max_attempts: 3, params: { week: 'int?', dry_run: 'bool?' } }),
    jobFixture({ name: 'claim-waivers', acts: true, max_attempts: 3, params: { week: 'int?' } }),
    jobFixture({
      name: 'scan-trades',
      acts: true,
      max_attempts: 1,
      schedules: [{ cron: '0 13 * * 3,5', tz: CHICAGO }],
      next_run_at: '2026-11-04T19:00:00Z',
    }),
  ],
}

export const healthFixture: LauncherHealth = {
  heartbeat_at: '2026-11-03T22:20:00Z',
  heartbeat_age_seconds: 12,
  queue_depths: { job_runs: 0, 'job_runs.dlq': 0 },
  running_count: 1,
  queued_count: 0,
}

function childRun(job_name: string, status: string, started_at: string, finished_at: string | null = null) {
  return {
    id: `run-${job_name}`,
    job_name,
    trigger_type: 'chain' as const,
    status: status as RunDetail['status'],
    started_at,
    finished_at,
  }
}

export const chainRootFixture: RunDetail = {
  id: 'root-1',
  job_name: 'sample-weekly',
  trigger_type: 'chain',
  status: 'running',
  started_at: '2026-11-03T22:00:00Z',
  finished_at: null,
  chain_root_id: 'root-1',
  scheduled_for: '2026-11-03T22:00:00Z',
  trigger: { chain: 'sample-weekly' },
  error: null,
  summary: {},
  input_count: 0,
  output_count: 0,
  llm_count: 0,
  links: {},
  parent: null,
  children: [
    childRun('sync-sample', 'success', '2026-11-03T22:00:01Z', '2026-11-03T22:04:01Z'),
    childRun('score-sample', 'running', '2026-11-03T22:04:05Z'),
  ],
}

export const runDetailFixture: RunDetail = {
  id: 'run-set-lineup',
  job_name: 'claim-waivers',
  trigger_type: 'chain',
  status: 'failure',
  started_at: '2026-11-04T02:14:00Z',
  finished_at: '2026-11-04T02:16:04Z',
  scheduled_for: '2026-11-04T02:12:00Z',
  attempt: 3,
  requested_by: null,
  chain_root_id: 'root-1',
  parent_run_id: 'root-1',
  end_reason: 'exit_code',
  executor: 'pod',
  k8s_job: 'claim-waivers-abc123-a3',
  trigger: { params: {}, downstream: false },
  error: 'Sample failure text',
  summary: { headline: 'Queued 2 sample claims', log_tail: ['INFO sample line'] },
  input_count: 4,
  output_count: 2,
  llm_count: 0,
  links: {},
  parent: { id: 'root-1', job_name: 'sample-weekly', status: 'failure', started_at: '2026-11-03T22:00:00Z' },
  children: [
    {
      ...childRun('waiver-worker', 'success', '2026-11-04T02:15:00Z', '2026-11-04T02:15:42Z'),
      trigger_type: 'queue',
      llm_sessions: [{ id: 'session-1', title: 'Sample claim reasoning' }],
    },
    { ...childRun('waiver-worker-2', 'failure', '2026-11-04T02:16:00Z', '2026-11-04T02:16:18Z'), trigger_type: 'queue', llm_sessions: [] },
  ],
}

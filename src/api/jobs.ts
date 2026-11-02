import { request } from './client'
import type { Run } from './runs'

// Mirrors fantasy-core-pipeline's src/schemas/jobs.py.

export interface LastRun {
  job_name: string
  id: string
  status: string
  started_at: string
  finished_at?: string | null
  trigger_type: string
}
export interface PauseInfo {
  name: string
  paused_until: string | null
  reason?: string | null
  set_by?: string | null
  set_at: string
}
export interface JobSchedule {
  cron: string
  tz: string
  catch_up?: string | null
  seasons?: string[]
}
export interface JobEvent {
  key: string
  debounce?: string
}
export interface JobInfo {
  name: string
  executor: string
  overlap: string
  max_attempts: number
  deadline_seconds: number
  alert: string
  acts: boolean
  /** Allowlist of on-demand params: name to type, with a trailing ? when optional. */
  params: Record<string, string>
  profile: string
  command: string[]
  schedules: JobSchedule[]
  on_event: JobEvent[]
  last_run?: LastRun | null
  /** Next slot of the job's own schedules. Null for a step with no schedule of its own. */
  next_run_at?: string | null
  pause?: PauseInfo | null
}
export interface ChainDependency {
  step: string
  on: 'success' | 'finish'
}
export interface ChainStepInfo {
  after: ChainDependency[]
  /** Local time, in the chain schedule's timezone, by which the step starts anyway. */
  latest?: string | null
  last_run?: LastRun | null
}
export interface ChainInfo {
  name: string
  schedule?: JobSchedule | null
  max_duration_seconds: number
  steps: Record<string, ChainStepInfo>
  next_run_at?: string | null
  pause?: PauseInfo | null
}
export interface JobCatalog {
  jobs: JobInfo[]
  chains: ChainInfo[]
}
export interface LauncherHealth {
  heartbeat_at: string
  heartbeat_age_seconds: number
  queue_depths: Record<string, number | null>
  running_count: number
  queued_count: number
}
export type RunParams = Record<string, string | number | boolean>
export interface StartRunRequest {
  params: RunParams
  downstream: boolean
}
export interface StartRunResponse {
  run_id: string
  status: string
  chain_root_id?: string | null
}
export interface CancelRunResponse {
  run_id: string
  status: string
}
export interface PauseRequest {
  /** When the pause ends, with a timezone. Null pauses until someone resumes it. */
  until: string | null
  reason: string
}
export interface PauseResponse {
  name: string
  paused_until: string | null
  reason: string
}
export interface ResumeResponse {
  name: string
  status: string
}
export interface UiConfig {
  grafana_url: string
}

export const RECENT_RUNS_LIMIT = 5

export const getJobCatalog = () => request<JobCatalog>('/v1/jobs')
export const getLauncherHealth = () => request<LauncherHealth>('/v1/launcher/health')

export const startJobRun = (name: string, body: StartRunRequest) =>
  request<StartRunResponse>(`/v1/jobs/${encodeURIComponent(name)}/runs`, {
    method: 'POST',
    body: JSON.stringify(body),
  })

/** Cancels a queued or running run. Cancelling a chain root also cancels its active steps. */
export const cancelRun = (runId: string) =>
  request<CancelRunResponse>(`/v1/runs/${encodeURIComponent(runId)}/cancel`, { method: 'POST' })

/** Pauses a job or a chain: its scheduled slots are skipped until ``until`` or a resume. */
export const pauseJob = (name: string, body: PauseRequest) =>
  request<PauseResponse>(`/v1/jobs/${encodeURIComponent(name)}/pause`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

export const resumeJob = (name: string) =>
  request<ResumeResponse>(`/v1/jobs/${encodeURIComponent(name)}/pause`, { method: 'DELETE' })

function runsOf(job: string, limit: number) {
  const params = new URLSearchParams({ job, limit: String(limit) })
  return request<{ items: Run[] }>(`/v1/activity/runs?${params}`)
}

export const getRecentJobRuns = (job: string) =>
  runsOf(job, RECENT_RUNS_LIMIT).then((page) => page.items)

/** A chain root is a run named after its chain, so the newest one is the latest chain run. */
export const getLatestChainRun = (chain: string): Promise<Run | null> =>
  runsOf(chain, 1).then((page) => page.items[0] ?? null)

/** Deployment settings nginx serves at runtime. The Vite dev server has no such route, so
 * a failed read means "not configured" rather than an error worth showing. */
export const getUiConfig = () =>
  request<UiConfig>('/ui-config.json').catch((): UiConfig => ({ grafana_url: '' }))

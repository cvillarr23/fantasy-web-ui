import { request } from './client'

export type TriggerType = 'schedule' | 'queue' | 'http' | 'manual'
export type RunStatus = 'running' | 'success' | 'failure'

export interface RunSummary {
  id: string
  job_name: string
  trigger_type: TriggerType
  status: RunStatus
  started_at: string
  finished_at?: string | null
}
export interface Run extends RunSummary {
  trigger: Record<string, unknown>
  parent_run_id?: string | null
  error?: string | null
  summary: Record<string, unknown>
  input_count: number
  output_count: number
  llm_count: number
}
export interface JobHealth extends Run {
  recent_failures: number
}
export interface DeadLetterQueue {
  queue: string
  messages: number
}
export type RefType = 'raw_signal' | 'rumor_signal' | 'llm_session' | 'activity_action'
export type TraceRoot = 'raw_signal' | 'rumor_signal' | 'activity_action'
// Display rows differ by ref type: an article, a rumor verdict, an LLM session or a move.
export interface LinkedRow {
  id: string
  missing?: boolean
  [field: string]: unknown
}
export interface RunDetail extends Run {
  links: Partial<Record<'input' | 'output', Partial<Record<RefType, LinkedRow[]>>>>
  parent?: { id: string; job_name: string; status: RunStatus; started_at: string } | null
  children: RunSummary[]
}
export interface TraceStage {
  key: 'ingest' | 'evaluation' | 'decision' | 'submission' | 'execution'
  title: string
  runs: RunSummary[]
  sessions: { id: string; title: string; status: string; created_at: string }[]
  items: LinkedRow[]
}
export interface Trace {
  root: { ref_type: TraceRoot; ref_id: string }
  stages: TraceStage[]
}

export const RUNS_PAGE_SIZE = 50

export interface RunFilters {
  job?: string
  status?: RunStatus | ''
  trigger?: TriggerType | ''
}
export const getRuns = (offset = 0, filters: RunFilters = {}) => {
  const params = new URLSearchParams({ offset: String(offset), limit: String(RUNS_PAGE_SIZE) })
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
  return request<{ items: Run[] }>(`/v1/activity/runs?${params}`)
}
export const getRun = (id: string) =>
  request<RunDetail>(`/v1/activity/runs/${encodeURIComponent(id)}`)
export const getJobs = () =>
  request<{ items: JobHealth[]; dead_letters: DeadLetterQueue[] | null }>('/v1/activity/jobs')
export const getTrace = (refType: TraceRoot, refId: string) =>
  request<Trace>(
    `/v1/activity/trace?ref_type=${refType}&ref_id=${encodeURIComponent(refId)}`,
  )

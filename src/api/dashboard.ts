import { request } from './client'
export interface ActivityAction {
  id: string
  title: string
  kind: string
  execution: string
  outcome: string
  created_at: string
  updated_at: string
  attempts: number
  unread: boolean
  payload: Record<string, unknown>
  evidence: Record<string, unknown>
  events?: { id: number; stage: string; detail: Record<string, unknown>; created_at: string }[]
  sessions?: { id: string; title: string; status: string }[]
}
export interface LlmSession {
  id: string
  title: string
  status: string
  action_id?: string
  updated_at: string
  content?: { role: string; content: unknown }[]
}
export interface LeagueRow {
  rank: number
  id: string
  name: string
  position?: string
  team?: string
  owner?: string
  points: number | null
  projected?: number | null
  wins?: number
  losses?: number
  ties?: number
  points_against?: number
}
export interface LeagueResponse {
  items: LeagueRow[]
  total: number
  updated_at: string
  coverage?: string
  scoring?: string
}
export interface MovePlayer {
  espn_id: string
  name: string
  position: string
  pro_team: string
  injury_status: string | null
  net_vorp?: number
  slot?: string
}
export interface MovePreview {
  before: MovePlayer[]
  after: MovePlayer[]
  incoming: MovePlayer[]
  outgoing: MovePlayer[]
  warnings: string[]
  weeks: {
    week: number
    before: number | null
    after: number | null
    delta: number | null
    source: string
    before_lineup: MovePlayer[]
    after_lineup: MovePlayer[]
  }[]
  updated_at: string
}
export const getActions = (offset = 0, attention = false) =>
  request<{ items: ActivityAction[] }>(
    `/v1/activity/actions?offset=${offset}&attention=${attention}`,
  )
export const getAction = (id: string) =>
  request<ActivityAction>(`/v1/activity/actions/${encodeURIComponent(id)}`)
export const checkAction = (id: string) =>
  request<ActivityAction>(`/v1/activity/actions/${encodeURIComponent(id)}/check`, {
    method: 'POST',
  })
export const markActivityRead = (id: string) =>
  request(`/v1/activity/read/${encodeURIComponent(id)}`, { method: 'POST' })
export const getSessions = (offset = 0) =>
  request<{ items: LlmSession[] }>(`/v1/activity/sessions?offset=${offset}`)
export const getSession = (id: string) =>
  request<LlmSession>(`/v1/activity/sessions/${encodeURIComponent(id)}`)
export const getLeagueRows = (
  view: string,
  season: number,
  week: number,
  offset: number,
  q: string,
  position: string,
  owner: string,
  totals: boolean,
) =>
  request<LeagueResponse>(
    `/v1/league/${view}?${new URLSearchParams({ season: String(season), week: String(week), offset: String(offset), q, position, owner, totals: String(totals) })}`,
  )
export const previewMove = (payload: {
  kind: string
  season: number
  start_week: number
  end_week: number
  incoming_espn_ids: string[]
  outgoing_espn_ids: string[]
}) =>
  request<MovePreview>(
    '/v1/roster/move-preview',
    { method: 'POST', body: JSON.stringify(payload) },
    90_000,
  )

import type { DraftConfig, DraftStatusResponse, PlayerSummary } from './types'

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!response.ok) {
    const body = await response.text()
    throw new ApiError(response.status, body || response.statusText)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function getDraftStatus(leagueId: string, season: number, limit = 10): Promise<DraftStatusResponse> {
  const params = new URLSearchParams({ league_id: leagueId, season: String(season), limit: String(limit) })
  return request(`/v1/draft/status?${params}`)
}

export function setDraftConfig(config: DraftConfig): Promise<unknown> {
  return request('/v1/draft/config', { method: 'POST', body: JSON.stringify(config) })
}

export function startDraftSync(): Promise<unknown> {
  return request('/v1/draft/start', { method: 'POST' })
}

export function pauseDraft(leagueId: string, pickNumber?: number): Promise<unknown> {
  return request('/v1/draft/pause', {
    method: 'POST',
    body: JSON.stringify({ league_id: leagueId, pick_number: pickNumber ?? null }),
  })
}

export function resumeDraft(leagueId: string, pickNumber?: number): Promise<unknown> {
  return request('/v1/draft/resume', {
    method: 'POST',
    body: JSON.stringify({ league_id: leagueId, pick_number: pickNumber ?? null }),
  })
}

// Publishes to the draft_targets queue (see fantasy-core-pipeline's /v1/trigger/draft-pick).
// This does NOT yet click ESPN's UI - that's fantasy-browser-worker's WORKER-06, unshipped.
export function triggerDraftPick(teamId: string, playerId: string, name: string, position: string, proTeam: string): Promise<unknown> {
  return request('/v1/trigger/draft-pick', {
    method: 'POST',
    body: JSON.stringify({ team_id: teamId, player_id: playerId, name, position, pro_team: proTeam }),
  })
}

export function getPlayerSummary(playerId: string): Promise<PlayerSummary> {
  return request(`/v1/players/${encodeURIComponent(playerId)}/summary`)
}

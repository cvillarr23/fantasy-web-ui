import type { DraftConfig, DraftStatusResponse, PlayerSearchResult, PlayerSummary, PracticeSyncJobStatus } from './types'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function extractErrorMessage(body: string, fallback: string): string {
  if (!body.trim()) return fallback
  try {
    const parsed = JSON.parse(body) as { detail?: unknown; message?: unknown }
    if (typeof parsed.detail === 'string' && parsed.detail.trim()) return parsed.detail
    if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message
  } catch {
    // Non-JSON error response - return as-is.
  }
  return body
}

/** True when a 409 means "the thing you asked for already exists, carry on".
 *
 * Only valid for the practice *room connector* (POST /v1/draft/practice/sync-job), where a
 * 409 genuinely means the same job is already running and reattaching is correct.
 *
 * Deliberately NOT used for POST /v1/draft/start. That endpoint returns 200 with
 * already_running: true when the listener for *this* league is up, so its 409 can only mean
 * a listener is stuck on a *different* league - which silently starves this draft of every
 * pick. Treating that as a benign reattach is what made a fatally broken run report itself
 * as connected. */
export function isAlreadyActiveError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false
  return err.status === 409 || /already\s+active/i.test(err.message)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!response.ok) {
    const body = await response.text()
    throw new ApiError(response.status, extractErrorMessage(body, response.statusText))
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

export function startDraftSync(leagueId?: string): Promise<unknown> {
  const params = leagueId ? `?${new URLSearchParams({ league_id: leagueId }).toString()}` : ''
  return request(`/v1/draft/start${params}`, { method: 'POST' })
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
// fantasy-browser-worker's draft_clicker.js (WORKER-06) consumes this and actually clicks
// the pick in ESPN's UI - this is a real, live action, not a log-only publish.
//
// espnPlayerId must be players.espn_id, NOT the internal Sleeper players.player_id: the
// worker clicks button.Button--draft[data-player-id=...], which is ESPN's namespace. The two
// overlap numerically (ESPN 12483 is Matthew Stafford, internal 12483 is Jack Bech), so
// sending the wrong one drafts a different, real player. The API rejects that case with 422.
export function triggerDraftPick(teamId: string, espnPlayerId: string, name: string, position: string, proTeam: string): Promise<unknown> {
  return request('/v1/trigger/draft-pick', {
    method: 'POST',
    body: JSON.stringify({ team_id: teamId, player_id: espnPlayerId, name, position, pro_team: proTeam }),
  })
}

export function getPlayerSummary(playerId: string): Promise<PlayerSummary> {
  return request(`/v1/players/${encodeURIComponent(playerId)}/summary`)
}

export function searchPlayers(query: string): Promise<PlayerSearchResult[]> {
  const params = new URLSearchParams({ q: query })
  return request(`/v1/players/search?${params}`)
}

// Creates fantasy-browser-worker's draft_sync.js Job pointed at a manually-joined ESPN
// mock/practice draft room - see fantasy-core-pipeline's /v1/draft/practice/sync-job.
export function startPracticeSyncJob(roomUrl: string): Promise<{ status: string; job_name: string }> {
  return request('/v1/draft/practice/sync-job', {
    method: 'POST',
    body: JSON.stringify({ room_url: roomUrl }),
  })
}

export function getPracticeSyncJobStatus(): Promise<PracticeSyncJobStatus> {
  return request('/v1/draft/practice/sync-job/status')
}

export function endPracticeSyncJob(): Promise<{ status: string; job_name: string }> {
  return request('/v1/draft/practice/sync-job', { method: 'DELETE' })
}

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

/** Default per-request ceiling. Several draft endpoints call the Kubernetes apiserver, which
 * has no timeout of its own - when the control plane degrades they simply never respond, and
 * an un-aborted fetch never settles. A promise that never settles is worse than a failed one:
 * it leaves the UI mid-flight forever with nothing to render and no way out. */
const DEFAULT_TIMEOUT_MS = 15_000

/** Teardown deletes a Job with Foreground propagation and then polls for the Pod to actually
 * go (15 polls x 2s server-side), so it is legitimately slow rather than hung. */
export const TEARDOWN_TIMEOUT_MS = 45_000

/** Thrown when a request is aborted for exceeding its timeout. Status 0 distinguishes it from
 * any real HTTP response, so callers can tell "the backend said no" from "the backend never
 * answered" - they usually warrant different recovery. */
export class ApiTimeoutError extends ApiError {
  constructor(path: string, timeoutMs: number) {
    super(0, `Request to ${path} timed out after ${Math.round(timeoutMs / 1000)}s - the backend did not respond.`)
  }
}

/** AbortSignal.any is not available everywhere Vite targets, so fall back to forwarding
 * whichever fires first. */
function mergeSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([a, b])
  const merged = new AbortController()
  const abort = () => merged.abort()
  if (a.aborted || b.aborted) abort()
  else {
    a.addEventListener('abort', abort, { once: true })
    b.addEventListener('abort', abort, { once: true })
  }
  return merged.signal
}

async function request<T>(path: string, init?: RequestInit, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<T> {
  const timeoutController = new AbortController()
  // An explicit flag rather than reading signal.aborted in the catch: the timer can fire in the
  // window between some other failure rejecting and the catch running, which would misreport a
  // genuine network or parse error as a timeout and send the user chasing the wrong problem.
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    timeoutController.abort()
  }, timeoutMs)
  // Merged rather than substituted: applying our signal after the init spread would defeat a
  // caller-supplied one, and applying theirs would defeat the timeout. Both have to survive.
  const callerSignal = init?.signal
  const signal = callerSignal ? mergeSignals(callerSignal, timeoutController.signal) : timeoutController.signal
  // The timer deliberately spans body consumption too, not just the fetch. fetch() resolves as
  // soon as headers arrive, so a backend that sends a 200 and then stalls the body would hang
  // .json() forever - reinstating the never-settles bug this whole change exists to remove.
  // Aborting the signal rejects the in-flight body read as well.
  try {
    const response = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
      signal,
    })
    if (!response.ok) {
      const body = await response.text()
      throw new ApiError(response.status, extractErrorMessage(body, response.statusText))
    }
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  } catch (err) {
    // The merged signal aborts for either reason; only claim a timeout if ours is why.
    if (timedOut) throw new ApiTimeoutError(path, timeoutMs)
    throw err
  } finally {
    clearTimeout(timer)
  }
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
//
// leagueId/pickNumber let the gateway reject a publish whose slot is already filled;
// expiresAt (ESPN's pick-clock deadline, not our own auto_publish_at) lets it reject one
// submitted after the window closed. Both checks 409. idempotency_key is generated fresh
// per call - this function is never used to retry a specific prior attempt.
//
// leagueId/pickNumber are required, not optional: making them easy to omit is exactly how
// the manual-pick path ended up with no slot validation at all before this fix. expiresAt
// stays optional - it's legitimately absent until the backend has scheduled a publish for
// this pick, and there's no deadline to violate before that happens either.
//
// mode is also required, not optional: fantasy-core-pipeline's draft_matrix.py forwards its
// own mode on the automated path (from the Job's env), but this manual path has no such
// env to read - the caller's stored DraftConfig.mode is the only source of truth. Confirmed
// live 2026-08-27: omitting it left the gateway forwarding no mode at all, so
// draft_clicker.js fell back to its safe "mode is unset" default (DRY_RUN=true) even for a
// practice league - the operator saw "drafted" toast but nothing was actually clicked, and
// ESPN autodrafted that slot once the clock ran out.
export function triggerDraftPick(
  teamId: string,
  espnPlayerId: string,
  name: string,
  position: string,
  proTeam: string,
  options: { leagueId: string; pickNumber: number; mode: 'live' | 'practice'; expiresAt?: number },
): Promise<unknown> {
  return request('/v1/trigger/draft-pick', {
    method: 'POST',
    body: JSON.stringify({
      team_id: teamId,
      player_id: espnPlayerId,
      name,
      position,
      pro_team: proTeam,
      idempotency_key: crypto.randomUUID(),
      league_id: options.leagueId,
      pick_number: options.pickNumber,
      mode: options.mode,
      expires_at: options.expiresAt,
    }),
  })
}

/** True when a 409 from POST /v1/trigger/draft-pick means the pick can no longer be made -
 * the slot was already filled or ESPN's pick deadline passed. Scoped to this endpoint only,
 * same caveat as isAlreadyActiveError above: a 409 elsewhere means something unrelated. */
export function isPickTooLateError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409
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
// force tears down whatever run is already there instead of 409ing, which is the only way
// out when a previous run is wedged (a Job stuck Terminating, or a control plane that stops
// answering long enough to strand one).
export function startPracticeSyncJob(roomUrl: string, force = false): Promise<{ status: string; job_name: string }> {
  const params = force ? '?force=true' : ''
  return request(`/v1/draft/practice/sync-job${params}`, {
    method: 'POST',
    body: JSON.stringify({ room_url: roomUrl }),
  }, force ? TEARDOWN_TIMEOUT_MS : undefined)
}

export function getPracticeSyncJobStatus(): Promise<PracticeSyncJobStatus> {
  return request('/v1/draft/practice/sync-job/status')
}

export function endPracticeSyncJob(): Promise<{ status: string; job_name: string }> {
  return request('/v1/draft/practice/sync-job', { method: 'DELETE' }, TEARDOWN_TIMEOUT_MS)
}

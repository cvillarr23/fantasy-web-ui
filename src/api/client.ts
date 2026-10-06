import type { BacktestResultDetail, BacktestResultSummary, ChatQueryResponse, DraftConfig, DraftStatusResponse, LineupRosterResponse, LineupSwapInstruction, MatchupResponse, PlayerSearchResult, PlayerSummary, PracticeSyncJobStatus, RosterDeficitsResponse, ScoreboardResponse, TradeEvaluationResponse, TradeOffer, TradeOfferList, VorpStat, WaiverPlayerSummary, WaiverRecommendationsResponse } from './types'

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
    if (Array.isArray(parsed.detail)) {
      const issues = parsed.detail.flatMap((item: unknown) => {
        if (!item || typeof item !== 'object') return []
        const { loc, msg } = item as { loc?: unknown; msg?: unknown }
        if (!Array.isArray(loc) || typeof msg !== 'string') return []
        const field = loc.filter((part): part is string => typeof part === 'string' && part !== 'body').join('.')
        return [`${field || 'Request'}: ${msg}`]
      })
      if (issues.length) return issues.join('; ')
    }
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

/** How long to wait for `window.location.href = ...` to actually navigate away before
 * assuming it's stuck (slow, popup-blocked, or a no-op in an iframe) and showing a fallback
 * message instead of leaving every caller's spinner frozen forever. */
const SESSION_EXPIRED_REDIRECT_FALLBACK_MS = 1_500

const SESSION_EXPIRED_BANNER_ID = 'session-expired-banner'

/** Shown only if the redirect from a 401 hasn't navigated away within
 * SESSION_EXPIRED_REDIRECT_FALLBACK_MS. Plain DOM APIs, not React: this module has no
 * framework dependency, and the promise that triggers this is deliberately never
 * resolving/rejecting, so no component's own error rendering can be reached to show it. */
function showSessionExpiredBanner(): void {
  if (document.getElementById(SESSION_EXPIRED_BANNER_ID)) return
  const banner = document.createElement('div')
  banner.id = SESSION_EXPIRED_BANNER_ID
  banner.textContent = 'Session expired — redirecting to sign-in…'
  banner.style.cssText =
    'position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:12px 16px;' +
    'background:#fa5252;color:#fff;font:14px/1.4 system-ui,sans-serif;text-align:center;'
  document.body.appendChild(banner)
}

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

async function networkRequest<T>(
  path: string,
  init?: RequestInit,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
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
    if (response.status === 401) {
      // oauth2-proxy fronts this app and /v1/* at the same origin (fantasy-infra#29) - a 401
      // here means the session expired mid-use, after the SPA already loaded. Redirect to its
      // sign-in page with rd= so login returns the user where they were, and never resolve the
      // promise rather than throwing ApiError: ~15 call sites catch ApiError and render it into
      // UI state, and a thrown 401 would flash an error in the instant before the page unloads.
      // Unlike ApiTimeoutError's never-settles concern above, this is safe - the page itself is
      // being torn down by the redirect, so nothing is left waiting on the hung promise. The
      // fallback timer below covers the case where the redirect doesn't take.
      const rd = window.location.pathname + window.location.search
      window.location.href = `/oauth2/sign_in?rd=${encodeURIComponent(rd)}`
      setTimeout(showSessionExpiredBanner, SESSION_EXPIRED_REDIRECT_FALLBACK_MS)
      return new Promise<T>(() => {})
    }
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

// Query hooks own read caching. Polls and explicit refreshes must reach the network.
export function request<T>(path: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  return networkRequest<T>(path, init, timeoutMs)
}

export function getDraftStatus(
  leagueId: string,
  season: number,
  limit = 10,
): Promise<DraftStatusResponse> {
  const params = new URLSearchParams({
    league_id: leagueId,
    season: String(season),
    limit: String(limit),
  })
  return request(`/v1/draft/status?${params}`)
}

// The server copy is the source of truth for league/team settings so they follow the operator
// across browsers/devices; 404 means no live config has been saved yet.
export function getDraftConfig(): Promise<DraftConfig> {
  return request('/v1/draft/config')
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

// Flips draft_config.auto_publish_enabled - the manual kill switch for this league's
// auto-publish (issue #108). Disabling here sets auto_publish_disabled_by='manual' on the
// backend; re-enabling clears it to null. Distinct from pause/resume: pause only holds the
// single upcoming pick, while this stops every future auto-publish for the league until
// flipped back (or until the backend's own circuit breaker trips and self-heals it).
export function setAutoPublishEnabled(leagueId: string, enabled: boolean): Promise<unknown> {
  return request('/v1/draft/auto-publish', {
    method: 'POST',
    body: JSON.stringify({ league_id: leagueId, enabled }),
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
// Takes the whole DraftConfig rather than separate teamId/leagueId/mode args on purpose:
// those three always come from the same stored config for a given draft, and passing them
// as independent parameters is exactly how a call site previously ended up omitting mode
// entirely (confirmed live 2026-08-27 - every trigger call across App.tsx,
// PracticeDraftScreen.tsx, and InterventionControls.tsx had built its own options object by
// hand, and one of them simply forgot the field). Threading the single config object closes
// off that whole class of per-call-site omission - there's no longer a second copy of
// team_id/league_id/mode to fall out of sync.
//
// pickNumber lets the gateway reject a publish whose slot is already filled; expiresAt
// (ESPN's pick-clock deadline, not our own auto_publish_at) lets it reject one submitted
// after the window closed. Both checks 409. idempotency_key is generated fresh per call -
// this function is never used to retry a specific prior attempt.
//
// pickNumber is required, not optional: making it easy to omit is exactly how the
// manual-pick path ended up with no slot validation at all before an earlier fix. expiresAt
// stays optional - it's legitimately absent until the backend has scheduled a publish for
// this pick, and there's no deadline to violate before that happens either.
//
// mode (config.mode) is what tells draft_clicker.js it's safe to submit for real in a
// practice room even when DRY_RUN is unset (which otherwise defaults to true everywhere,
// live included). Omitting it left the gateway forwarding no mode at all, so draft_clicker.js
// fell back to its safe "mode is unset" default (DRY_RUN=true) even for a practice league -
// the operator saw "drafted" toast but nothing was actually clicked, and ESPN autodrafted
// that slot once the clock ran out.
export function triggerDraftPick(
  config: DraftConfig,
  espnPlayerId: string,
  name: string,
  position: string,
  proTeam: string,
  options: { pickNumber: number; expiresAt?: number },
): Promise<unknown> {
  return request('/v1/trigger/draft-pick', {
    method: 'POST',
    body: JSON.stringify({
      team_id: config.team_id,
      player_id: espnPlayerId,
      name,
      position,
      pro_team: proTeam,
      idempotency_key: crypto.randomUUID(),
      league_id: config.league_id,
      pick_number: options.pickNumber,
      mode: config.mode,
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

export function getRosterDeficits(season: number, week: number): Promise<RosterDeficitsResponse> {
  const params = new URLSearchParams({ season: String(season), week: String(week) })
  return request(`/v1/roster/deficits?${params}`)
}

export function getWaiverRecommendations(season: number, week: number): Promise<WaiverRecommendationsResponse> {
  const params = new URLSearchParams({ season: String(season), week: String(week) })
  return request(`/v1/waiver/recommendations?${params}`)
}

// Live ESPN fetch (see matchup_service.py) - no historical data, always "this week as ESPN
// sees it right now". 404s on a bye week or before the season/matchup exists.
export function getMatchup(season: number, week: number): Promise<MatchupResponse> {
  const params = new URLSearchParams({ season: String(season), week: String(week) })
  return request(`/v1/matchup?${params}`)
}

// Every matchup in the league for a week, score-only - see get_league_scoreboard in
// matchup_service.py. Unlike getMatchup, never 404s (an empty week just returns []).
export function getScoreboard(season: number, week: number): Promise<ScoreboardResponse> {
  const params = new URLSearchParams({ season: String(season), week: String(week) })
  return request(`/v1/matchup/scoreboard?${params}`)
}

export function getTeamNames(leagueId?: string): Promise<Record<string, string>> {
  const params = leagueId ? `?${new URLSearchParams({ league_id: leagueId })}` : ''
  return request(`/v1/league/teams${params}`)
}

// Sourced from Team.roster (not box_scores()), so it works on a bye week - see
// get_current_team_roster in matchup_service.py.
export function getLineupRoster(season: number, week?: number): Promise<LineupRosterResponse> {
  const params = new URLSearchParams({ season: String(season) })
  if (week) params.set('week', String(week))
  return request(`/v1/matchup/roster?${params}`)
}

export function getCurrentWeek(season?: number): Promise<{
  week: number
  season?: number
  max_week?: number
  source?: string
  updated_at?: string
}> {
  return request(`/v1/league/current-week${season ? `?season=${season}` : ''}`)
}

// Publishes to the lineup_updates queue (see fantasy-core-pipeline's /v1/trigger/lineup).
// fantasy-browser-worker's lineup_bot.js consumes this and actually submits the swap to
// ESPN's REST API - this is a real, live write, not a dry run (DRY_RUN defaults to false).
//
// Unlike triggerDraftPick, there's no SSE stream confirming a lineup swap landed - a 202
// here only means the queue accepted the message, not that ESPN's roster actually changed.
// lineup_bot.js verifies its own writes and dumps failure context to disk on error, but none
// of that is visible from this UI.
//
// The same holds for IR entries: the worker checks IR eligibility and ESPN can still refuse
// the move (a healthy player, a full IR slot) after this has already returned 202. status is
// "duplicate" when the gateway already accepted this idempotency key; it is optional because
// older gateways omit it.
export function triggerLineupSwap(
  teamId: string,
  swaps: LineupSwapInstruction[],
  idempotencyKey: string = crypto.randomUUID(),
): Promise<{ status?: 'accepted' | 'duplicate'; tracking_id: string }> {
  return request('/v1/trigger/lineup', {
    method: 'POST',
    body: JSON.stringify({
      team_id: teamId,
      optimized_swaps: swaps,
      idempotency_key: idempotencyKey,
    }),
  })
}

// Acceptance means the queue received the claim; it does not confirm an ESPN transaction.
export interface WaiverClaimResponse {
  status: 'accepted' | 'duplicate'
  queue: string
  team_id: string
  tracking_id: string
}

export function triggerWaiverClaim(
  config: DraftConfig,
  addPlayer: WaiverPlayerSummary,
  dropPlayer?: WaiverPlayerSummary,
  idempotencyKey?: string,
  // Always sent explicitly: the worker's own default is dry-run, which is right for
  // automated triggers but not for a manager confirming their own claim.
  dryRun = false,
): Promise<WaiverClaimResponse> {
  if (!addPlayer.espn_id) throw new Error('Claimed player has no ESPN ID.')
  if (!addPlayer.pro_team) throw new Error('Claimed player has no NFL team.')
  if (dropPlayer && !dropPlayer.espn_id) throw new Error('Drop player has no ESPN ID.')
  return request('/v1/trigger/waiver', {
    method: 'POST',
    body: JSON.stringify({
      team_id: config.team_id,
      player_id: addPlayer.espn_id,
      name: addPlayer.name,
      team: addPlayer.pro_team,
      idempotency_key: idempotencyKey ?? crypto.randomUUID(),
      dry_run: dryRun,
      ...(dropPlayer ? { drop_player_id: dropPlayer.espn_id } : {}),
    }),
  })
}

// Calls fantasy-core-pipeline's evaluate_proposed_trade - a read-only VORP comparison, unlike
// triggerDraftPick/triggerLineupSwap this never reaches the browser worker or ESPN, so it
// addresses players by the internal (Sleeper) player_id, not espn_id.
export interface VorpStatsQuery {
  season: number
  week?: number
  position?: string
  sort?: 'vorp' | 'projected_points' | 'actual_points' | 'week'
  limit?: number
}

export function getVorpStats(query: VorpStatsQuery): Promise<VorpStat[]> {
  const params = new URLSearchParams({ season: String(query.season) })
  if (query.week !== undefined) params.set('week', String(query.week))
  if (query.position) params.set('position', query.position)
  if (query.sort) params.set('sort', query.sort)
  if (query.limit !== undefined) params.set('limit', String(query.limit))
  return request(`/v1/stats/vorp?${params}`)
}

export function getBacktestResults(): Promise<BacktestResultSummary[]> {
  return request('/v1/backtest/results')
}

export function getBacktestResultDetail(season: number): Promise<BacktestResultDetail> {
  return request(`/v1/backtest/results/${encodeURIComponent(String(season))}`)
}

export function evaluateTrade(
  incomingPlayerIds: string[],
  outgoingPlayerIds: string[],
  season: number,
  week: number,
): Promise<TradeEvaluationResponse> {
  return request('/v1/trade/evaluate', {
    method: 'POST',
    body: JSON.stringify({
      incoming_player_ids: incomingPlayerIds,
      outgoing_player_ids: outgoingPlayerIds,
      season,
      week,
    }),
  })
}

export function queryChat(
  question: string,
  season: number,
  week: number,
  teamId: string,
  sessionId?: string,
): Promise<ChatQueryResponse> {
  return request('/v1/chat/query', {
    method: 'POST',
    body: JSON.stringify({ question, season, week, team_id: teamId, session_id: sessionId }),
  })
}

/** True when a 503 from POST /v1/chat/query means no LLM provider is currently reachable -
 * an expected, retry-later condition, not a bug. */
export function isNoProviderError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 503
}

export async function getOutgoingTradeOffers(config: DraftConfig): Promise<TradeOffer[]> {
  const offers: TradeOffer[] = []
  const limit = 100
  // The API filters league/season but not source/team. Read all pages before filtering
  // so other managers' offers cannot hide ours behind an apparently empty first page.
  for (let offset = 0; ; offset += limit) {
    const params = new URLSearchParams({
      status: 'awaiting_approval', league_id: config.league_id,
      season: String(config.season), limit: String(limit), offset: String(offset),
    })
    const page = await request<TradeOfferList>(`/v1/trade/offers?${params}`)
    offers.push(...page.offers.filter((offer) =>
      offer.league_id === config.league_id && offer.season === config.season &&
      offer.from_team_id === config.team_id && offer.source === 'proposal' &&
      offer.status === 'awaiting_approval' && Boolean(offer.to_team_id) &&
      offer.to_team_id !== config.team_id,
    ))
    if (page.offers.length < limit) return offers
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  endPracticeSyncJob,
  getPracticeSyncJobStatus,
  isAlreadyActiveError,
  setDraftConfig,
  startDraftSync,
  startPracticeSyncJob,
  triggerDraftPick,
} from '../api/client'
import type { DraftConfig, PracticeSyncJobStatus } from '../api/types'
import { InterventionControls } from './InterventionControls'
import { PickFeed } from './PickFeed'
import { RecommendationPanel } from './RecommendationPanel'
import { StatusHeader } from './StatusHeader'
import { useDraftStream } from '../hooks/useDraftStream'

const ACTIVE_JOB_STORAGE_KEY = 'fantasy-web-ui.practice-sync-active'
const PRACTICE_CONFIG_STORAGE_KEY = 'fantasy-web-ui.practice-config'
const SHOW_INTERVENTIONS_STORAGE_KEY = 'fantasy-web-ui.practice-show-interventions'
const POLL_INTERVAL_MS = 3000
const TERMINAL_JOB_STATES: PracticeSyncJobStatus['job_state'][] = ['Succeeded', 'Failed']

interface ParsedPracticeRoom {
  leagueId: string
  teamId: string
  season: number
}

function getFirstSearchParam(search: URLSearchParams, keys: string[]): string {
  for (const key of keys) {
    const value = search.get(key)
    if (value && value.trim()) return value.trim()
  }
  return ''
}

function parsePracticeRoom(urlString: string): ParsedPracticeRoom | null {
  try {
    const url = new URL(urlString)
    const leagueId = getFirstSearchParam(url.searchParams, ['leagueId', 'league_id'])
    const teamId = getFirstSearchParam(url.searchParams, ['teamId', 'team_id'])
    const seasonRaw = getFirstSearchParam(url.searchParams, ['seasonId', 'season', 'season_id'])
    const season = Number(seasonRaw)
    return {
      leagueId,
      teamId,
      season: Number.isFinite(season) && season > 0 ? season : new Date().getFullYear(),
    }
  } catch {
    return null
  }
}

function loadStoredPracticeConfig(): DraftConfig | null {
  try {
    const raw = window.localStorage.getItem(PRACTICE_CONFIG_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DraftConfig>
    if (!parsed.league_id || !parsed.team_id || !parsed.season) return null
    return {
      league_id: parsed.league_id,
      team_id: parsed.team_id,
      season: parsed.season,
      mode: 'practice',
    }
  } catch {
    return null
  }
}

function loadShowInterventions(): boolean {
  try {
    return window.localStorage.getItem(SHOW_INTERVENTIONS_STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

// job_state is the k8s Job's own lifecycle, not proof draft_sync.js has actually connected
// to the ESPN room - "Active" just means the Pod is up/retrying, so label it as such rather
// than claiming a room connection the backend doesn't actually confirm.
const JOB_STATE_LABEL: Record<Exclude<PracticeSyncJobStatus['job_state'], 'Active'>, string> = {
  Succeeded: 'Ended',
  Failed: 'Failed - check the Job logs',
  Unknown: 'Connecting…',
}

export function PracticeDraftScreen() {
  const [initialPracticeConfig] = useState<DraftConfig | null>(() => loadStoredPracticeConfig())
  const [roomUrl, setRoomUrl] = useState('')
  const [practiceConfig, setPracticeConfig] = useState<DraftConfig | null>(initialPracticeConfig)
  const [leagueId, setLeagueId] = useState(initialPracticeConfig?.league_id ?? '')
  const [teamId, setTeamId] = useState(initialPracticeConfig?.team_id ?? '')
  const [season, setSeason] = useState<number>(initialPracticeConfig?.season ?? new Date().getFullYear())
  const [checking, setChecking] = useState(true)
  const [tracking, setTracking] = useState(false)
  const [jobState, setJobState] = useState<PracticeSyncJobStatus['job_state'] | null>(null)
  const [roomConnected, setRoomConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [needsDraftSyncRetry, setNeedsDraftSyncRetry] = useState(false)
  const [showInterventions, setShowInterventions] = useState<boolean>(() => loadShowInterventions())

  const cancelledRef = useRef(false)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { status, connected, connectionState, reconnectCount, lastUpdatedAt, stale } = useDraftStream(
    practiceConfig?.league_id ?? '',
    practiceConfig?.season ?? 0,
  )
  const streamMatchesPracticeConfig =
    Boolean(practiceConfig) &&
    status?.league_id === practiceConfig?.league_id &&
    status?.season === practiceConfig?.season
  const activeStatus = streamMatchesPracticeConfig ? status : null
  const hasMismatchedStream = Boolean(practiceConfig && status && !streamMatchesPracticeConfig)
  const nextPickNumber = activeStatus?.recommendation?.pick_number ? Number(activeStatus.recommendation.pick_number) : undefined

  // The Job can outlive this browser's local state (storage cleared, started from another
  // browser, a reload after it finished) - so localStorage is only ever a hint, never the
  // source of truth. Every poll (including the first, on mount) reconciles against the
  // backend's actual status instead. Scheduled with setTimeout rather than setInterval so
  // the next poll only fires after the current one resolves - no overlapping requests, and
  // no risk of an older in-flight response clobbering a newer one. Stops once the Job
  // reaches a terminal state instead of polling a finished Job forever.
  const poll = useCallback(async function pollStatus() {
    try {
      const status = await getPracticeSyncJobStatus()
      if (cancelledRef.current) return
      setJobState(status.job_state)
      setRoomConnected(Boolean(status.room_connected))
      if (status.job_state === 'Unknown') {
        window.localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY)
        setTracking(false)
        setRoomConnected(false)
      } else {
        window.localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, '1')
        setTracking(true)
        if (!TERMINAL_JOB_STATES.includes(status.job_state)) {
          pollTimeoutRef.current = setTimeout(pollStatus, POLL_INTERVAL_MS)
        }
      }
    } catch (err) {
      if (!cancelledRef.current) setError(getErrorMessage(err))
    } finally {
      if (!cancelledRef.current) setChecking(false)
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    poll()
    return () => {
      cancelledRef.current = true
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
    }
  }, [poll])


  const isValidUrl = /^https:\/\//.test(roomUrl.trim())
  const hasRequiredConfig = leagueId.trim() && teamId.trim() && season > 0

  function updateRoomUrl(value: string) {
    setRoomUrl(value)
    const parsed = parsePracticeRoom(value.trim())
    if (!parsed) return
    if (parsed.leagueId) setLeagueId(parsed.leagueId)
    if (parsed.teamId) setTeamId(parsed.teamId)
    if (parsed.season) setSeason(parsed.season)
  }

   async function handleStart(e: React.FormEvent) {
     e.preventDefault()
     setBusy(true)
     setError(null)
      setNotice(null)
      setNeedsDraftSyncRetry(false)
     let practiceJobTracking = false
     try {
       const config: DraftConfig = {
         league_id: leagueId.trim(),
         team_id: teamId.trim(),
         season,
         mode: 'practice',
       }

       try {
         await startPracticeSyncJob(roomUrl.trim())
       } catch (err) {
         if (!isAlreadyActiveError(err)) throw err
         // A 409 only proves that some practice sync job is active; it does not prove
         // that job uses the room URL currently entered. Require the user to end the
         // existing run explicitly to avoid accidentally overwriting an active practice draft.
         setError('A practice room sync job is already active. Please end it before starting a new one.')
         setBusy(false)
         return
       }

       practiceJobTracking = true
       setTracking(true)
       setJobState('Unknown')
       setRoomConnected(false)
       setPracticeConfig(config)

       // Persist tracking early so UI can show recovery controls even if later steps fail.
       // Treat storage as best-effort to ensure startup continues if localStorage is blocked.
       try {
         window.localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, '1')
         window.localStorage.setItem(PRACTICE_CONFIG_STORAGE_KEY, JSON.stringify(config))
       } catch {
         // Storage unavailable (e.g., private mode) - continue without persistence
       }

       await setDraftConfig(config)
       try {
         await startDraftSync(config.league_id)
       } catch (err) {
          if (isAlreadyActiveError(err)) {
            setNotice('Draft-sync is already active for this league. Reconnected to the existing run.')
          } else {
            setNeedsDraftSyncRetry(true)
            setError(`Practice room connected, but draft listener failed to start: ${getErrorMessage(err)}`)
          }
       }

       if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
       poll()
     } catch (err) {
       // Keep tracking visible if we attached to an already-running practice job.
       if (practiceJobTracking) {
         if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
         poll()
       }
       setError(getErrorMessage(err))
     } finally {
       setBusy(false)
     }
   }

  async function handleRetryDraftSyncStart() {
    if (!practiceConfig) return
    setBusy(true)
    setError(null)
    try {
      await startDraftSync(practiceConfig.league_id)
      setNeedsDraftSyncRetry(false)
      setNotice('Draft listener start request accepted. Waiting for picks and recommendations...')
    } catch (err) {
      if (isAlreadyActiveError(err)) {
        setNeedsDraftSyncRetry(false)
        setNotice('Draft listener is already active. Reconnected to the existing run.')
        return
      }
      setError(`Retry failed: ${getErrorMessage(err)}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleEnd() {
    setBusy(true)
    setError(null)
    setNotice(null)
    setNeedsDraftSyncRetry(false)
    try {
      await endPracticeSyncJob()
      // Only clear local tracking once the backend confirms the Job is actually gone - if
      // the DELETE failed, the worker Job may still be Active, so the End control (and the
      // fact we're still tracking it) must stay in place for the user to retry.
      window.localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY)
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
      setTracking(false)
      setJobState(null)
      setRoomConnected(false)
      setPracticeConfig(null)
      window.localStorage.removeItem(PRACTICE_CONFIG_STORAGE_KEY)
      setRoomUrl('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function handleToggleInterventions(enabled: boolean) {
    setShowInterventions(enabled)
    window.localStorage.setItem(SHOW_INTERVENTIONS_STORAGE_KEY, enabled ? '1' : '0')
  }

  return (
    <div className={`practice-draft-screen ${tracking && practiceConfig ? 'with-dashboard' : ''}`}>
      <h1>Practice draft</h1>
      <p className="subtitle">
        Join or create a mock draft room yourself at{' '}
        <span className="mono">fantasy.espn.com/football/mockdraftlobby</span>, then paste that room's URL below to
        start syncing its picks.
      </p>

      {checking && <p className="muted">Checking for an active practice run…</p>}

      {!checking && !tracking && (
        <form onSubmit={handleStart}>
          <label>
            Practice draft room URL
            <input
              value={roomUrl}
              onChange={(e) => updateRoomUrl(e.target.value)}
              placeholder="https://fantasy.espn.com/football/draft?..."
              required
            />
          </label>
          <label>
            Practice league ID
            <input value={leagueId} onChange={(e) => setLeagueId(e.target.value)} required />
          </label>
          <label>
            Your practice team ID
            <input value={teamId} onChange={(e) => setTeamId(e.target.value)} required />
          </label>
          <label>
            Season
            <input type="number" min="2000" value={season} onChange={(e) => setSeason(Number(e.target.value))} required />
          </label>
          <button type="submit" disabled={busy || !isValidUrl || !hasRequiredConfig}>
            Start practice sync
          </button>
        </form>
      )}

      {!checking && tracking && (
        <div className="practice-status">
          <p>
            <span
              role="status"
              aria-live="polite"
              className={`health-badge health-${jobState === 'Failed' ? 'degraded' : jobState === 'Active' && roomConnected ? 'healthy' : 'stale'}`}
            >
              {jobState
                ? jobState === 'Active'
                  ? roomConnected
                    ? 'Connected to draft room - syncing picks'
                    : 'Job running - connecting to room...'
                  : JOB_STATE_LABEL[jobState]
                : 'Connecting…'}
            </span>
          </p>
          <button disabled={busy} onClick={handleEnd}>
            End practice run
          </button>
          <label className="practice-toggle">
            <input
              type="checkbox"
              checked={showInterventions}
              onChange={(e) => handleToggleInterventions(e.target.checked)}
            />
            Show intervention controls
          </label>
        </div>
      )}

      {!checking && tracking && (
        <div className="practice-banners">
          {notice && (
            <p className="banner banner-info" role="status" aria-live="polite">
              {notice}
            </p>
          )}
          {needsDraftSyncRetry && (
            <p className="banner banner-warning" role="status" aria-live="polite">
              Draft listener is not confirmed yet. Retry start to resume picks/recommendations.
              <button type="button" onClick={handleRetryDraftSyncStart} disabled={busy || !practiceConfig}>
                Retry draft listener start
              </button>
            </p>
          )}
          {hasMismatchedStream && (
            <p className="banner banner-warning" role="status" aria-live="polite">
              Received stream updates for a different league/season. Waiting for the active practice stream.
            </p>
          )}
          {practiceConfig && jobState === 'Active' && roomConnected && !activeStatus && !hasMismatchedStream && (
            <p className="banner banner-info" role="status" aria-live="polite">
              Connected to room. Waiting for draft status events for league {practiceConfig.league_id} ({practiceConfig.season}).
            </p>
          )}
          {activeStatus && activeStatus.recent_picks.length === 0 && (
            <p className="banner banner-info" role="status" aria-live="polite">
              Connected and listening. No picks have been observed yet.
            </p>
          )}
        </div>
      )}

      {!checking && tracking && !practiceConfig && (
        <p className="muted">Missing saved practice config. End this run, then restart with league/team/season details.</p>
      )}

      {!checking && tracking && practiceConfig && (
        <div className="dashboard">
          <StatusHeader
            status={activeStatus}
            connected={streamMatchesPracticeConfig ? connected : false}
            connectionState={streamMatchesPracticeConfig ? connectionState : 'connecting'}
            reconnectCount={streamMatchesPracticeConfig ? reconnectCount : 0}
            lastUpdatedAt={streamMatchesPracticeConfig ? lastUpdatedAt : null}
            stale={streamMatchesPracticeConfig ? stale : false}
            myTeamId={practiceConfig.team_id}
          />
          <div className="dashboard-grid">
            <PickFeed picks={activeStatus?.recent_picks ?? []} myTeamId={practiceConfig.team_id} />
            <div className="dashboard-side">
              <RecommendationPanel
                recommendation={activeStatus?.recommendation ?? {}}
                onDraftPlayer={(playerId, name, position, proTeam) =>
                  triggerDraftPick(practiceConfig.team_id, playerId, name, position, proTeam)
                }
              />
              {showInterventions && (
                <InterventionControls
                  leagueId={practiceConfig.league_id}
                  teamId={practiceConfig.team_id}
                  pickNumber={nextPickNumber}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  )
}

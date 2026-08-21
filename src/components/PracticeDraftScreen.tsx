import { useCallback, useEffect, useRef, useState } from 'react'
import { endPracticeSyncJob, getPracticeSyncJobStatus, startPracticeSyncJob } from '../api/client'
import type { PracticeSyncJobStatus } from '../api/types'

const ACTIVE_JOB_STORAGE_KEY = 'fantasy-web-ui.practice-sync-active'
const POLL_INTERVAL_MS = 3000
const TERMINAL_JOB_STATES: PracticeSyncJobStatus['job_state'][] = ['Succeeded', 'Failed']

// job_state is the k8s Job's own lifecycle, not proof draft_sync.js has actually connected
// to the ESPN room - "Active" just means the Pod is up/retrying, so label it as such rather
// than claiming a room connection the backend doesn't actually confirm.
const JOB_STATE_LABEL: Record<PracticeSyncJobStatus['job_state'], string> = {
  Active: 'Job running - syncing picks from the room',
  Succeeded: 'Ended',
  Failed: 'Failed - check the Job logs',
  Unknown: 'Connecting…',
}

export function PracticeDraftScreen() {
  const [roomUrl, setRoomUrl] = useState('')
  const [checking, setChecking] = useState(true)
  const [tracking, setTracking] = useState(false)
  const [jobState, setJobState] = useState<PracticeSyncJobStatus['job_state'] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancelledRef = useRef(false)
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      if (status.job_state === 'Unknown') {
        window.localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY)
        setTracking(false)
      } else {
        window.localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, '1')
        setTracking(true)
        if (!TERMINAL_JOB_STATES.includes(status.job_state)) {
          pollTimeoutRef.current = setTimeout(pollStatus, POLL_INTERVAL_MS)
        }
      }
    } catch (err) {
      if (!cancelledRef.current) setError(String(err))
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

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await startPracticeSyncJob(roomUrl.trim())
      window.localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, '1')
      setTracking(true)
      setJobState('Unknown')
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
      poll()
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleEnd() {
    setBusy(true)
    setError(null)
    try {
      await endPracticeSyncJob()
      // Only clear local tracking once the backend confirms the Job is actually gone - if
      // the DELETE failed, the worker Job may still be Active, so the End control (and the
      // fact we're still tracking it) must stay in place for the user to retry.
      window.localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY)
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current)
      setTracking(false)
      setJobState(null)
      setRoomUrl('')
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="practice-draft-screen">
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
              onChange={(e) => setRoomUrl(e.target.value)}
              placeholder="https://fantasy.espn.com/football/draft?..."
              required
            />
          </label>
          <button type="submit" disabled={busy || !isValidUrl}>
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
              className={`health-badge health-${jobState === 'Active' ? 'healthy' : jobState === 'Failed' ? 'degraded' : 'stale'}`}
            >
              {jobState ? JOB_STATE_LABEL[jobState] : 'Connecting…'}
            </span>
          </p>
          <button disabled={busy} onClick={handleEnd}>
            End practice run
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  )
}

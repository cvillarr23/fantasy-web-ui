import { useEffect, useRef, useState } from 'react'
import { endPracticeSyncJob, getPracticeSyncJobStatus, startPracticeSyncJob } from '../api/client'
import type { PracticeSyncJobStatus } from '../api/types'

const ACTIVE_JOB_STORAGE_KEY = 'fantasy-web-ui.practice-sync-active'
const POLL_INTERVAL_MS = 3000

const JOB_STATE_LABEL: Record<PracticeSyncJobStatus['job_state'], string> = {
  Active: 'Connected - syncing picks from the room',
  Succeeded: 'Ended',
  Failed: 'Failed - check the Job logs',
  Unknown: 'Connecting…',
}

export function PracticeDraftScreen() {
  const [roomUrl, setRoomUrl] = useState('')
  const [tracking, setTracking] = useState(() => window.localStorage.getItem(ACTIVE_JOB_STORAGE_KEY) === '1')
  const [jobState, setJobState] = useState<PracticeSyncJobStatus['job_state'] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!tracking) return

    async function poll() {
      try {
        const status = await getPracticeSyncJobStatus()
        setJobState(status.job_state)
      } catch (err) {
        setError(String(err))
      }
    }

    poll()
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [tracking])

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
    } catch (err) {
      setError(String(err))
    } finally {
      window.localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY)
      setTracking(false)
      setJobState(null)
      setRoomUrl('')
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

      {!tracking && (
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

      {tracking && (
        <div className="practice-status">
          <p>
            <span className={`health-badge health-${jobState === 'Active' ? 'healthy' : jobState === 'Failed' ? 'degraded' : 'stale'}`}>
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

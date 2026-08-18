import { useEffect, useRef, useState } from 'react'
import type { DraftStatusResponse } from '../api/types'

const STALE_AFTER_MS = 15_000 // ~7x the backend's 2s SSE poll interval

interface DraftStreamState {
  status: DraftStatusResponse | null
  connected: boolean
  lastUpdatedAt: number | null
  stale: boolean
}

// The backend's SSE endpoint (GET /v1/draft/status stream) only emits when the
// aggregated status actually changes - see fantasy-core-pipeline's
// _draft_status_event_generator - so "no new event in a while" is a real signal, not
// just quiet data. pipeline_health itself doesn't catch a stalled-but-reachable job (no
// staleness check on the backend), so this client-side timer is the UI's own safeguard.
export function useDraftStream(leagueId: string, season: number, limit = 10): DraftStreamState {
  const [status, setStatus] = useState<DraftStatusResponse | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  const [stale, setStale] = useState(false)
  const lastUpdatedRef = useRef<number | null>(null)

  useEffect(() => {
    if (!leagueId || !season) return

    const params = new URLSearchParams({ league_id: leagueId, season: String(season), limit: String(limit) })
    const source = new EventSource(`/v1/draft/stream?${params}`)

    source.onopen = () => setConnected(true)
    source.onerror = () => setConnected(false)
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as DraftStatusResponse
        setStatus(payload)
        lastUpdatedRef.current = Date.now()
        setLastUpdatedAt(lastUpdatedRef.current)
        setStale(false)
      } catch {
        // Malformed payload - skip this event, keep the connection open for the next one.
      }
    }

    const staleCheck = window.setInterval(() => {
      if (lastUpdatedRef.current !== null && Date.now() - lastUpdatedRef.current > STALE_AFTER_MS) {
        setStale(true)
      }
    }, 2_000)

    return () => {
      source.close()
      window.clearInterval(staleCheck)
    }
  }, [leagueId, season, limit])

  return { status, connected, lastUpdatedAt, stale }
}

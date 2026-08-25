import { useEffect, useRef, useState } from 'react'
import { getDraftStatus } from '../api/client'
import type { DraftPickSummary, DraftStatusResponse } from '../api/types'
import type { DiagnosticsLogEntry, DiagnosticsLevel } from './useDiagnosticsLog'
import { useDiagnosticsLog } from './useDiagnosticsLog'

const HEARTBEAT_INTERVAL_MS = 2_000
const STALE_AFTER_MS = HEARTBEAT_INTERVAL_MS * 4

interface DraftStreamState {
  status: DraftStatusResponse | null
  connected: boolean
  connectionState: 'idle' | 'connecting' | 'connected' | 'reconnecting'
  reconnectCount: number
  lastHeartbeatAt: number | null
  lastPickAt: number | null
  stale: boolean
  diagnostics: DiagnosticsLogEntry[]
}

const STATUS_TRANSITIONS = [
  ['listener_state', 'Listener'],
  ['job_state', 'Job'],
  ['pipeline_health', 'Pipeline health'],
] as const

function summarizePick(pick: DraftPickSummary): string {
  const round = pick.round === null ? '' : ` round ${pick.round}`
  const player = pick.name?.trim() || `Player ${pick.player_id}`
  const position = pick.position ? ` (${pick.position})` : ''
  return `Pick #${pick.pick_number}${round}: ${player}${position} to team ${pick.team_id}`
}

function pickKey(pick: DraftPickSummary): string {
  return `${pick.pick_number}:${pick.player_id}:${pick.team_id}`
}

function describeError(error: Record<string, unknown>): string {
  for (const key of ['message', 'error', 'exception', 'detail']) {
    const value = error[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

function appendStatusDiagnostics(
  payload: DraftStatusResponse,
  previous: DraftStatusResponse | null,
  source: 'snapshot' | 'sse',
  append: (level: DiagnosticsLevel, message: string, detail?: unknown) => void,
) {
  if (!previous) {
    append('info', `Draft status received from ${source}`, {
      league_id: payload.league_id,
      season: payload.season,
      mode: payload.mode,
      listener_state: payload.listener_state,
      job_state: payload.job_state,
      pipeline_health: payload.pipeline_health,
      recent_picks: payload.recent_picks.length,
    })
    if (payload.recent_picks.length > 0) {
      append('info', `Loaded ${payload.recent_picks.length} recent picks; latest ${summarizePick(payload.recent_picks[0])}`)
    }
  } else {
    for (const [field, label] of STATUS_TRANSITIONS) {
      if (previous[field] !== payload[field]) {
        append('info', `${label} changed: ${previous[field]} → ${payload[field]}`)
      }
    }

    const previousPicks = new Set(previous.recent_picks.map(pickKey))
    const newPicks = payload.recent_picks.filter((pick) => !previousPicks.has(pickKey(pick)))
    for (const pick of [...newPicks].sort((a, b) => a.pick_number - b.pick_number)) {
      append('info', `New pick observed: ${summarizePick(pick)}`, pick)
    }
  }

  if (payload.listener_error && payload.listener_error !== previous?.listener_error) {
    append('error', `Listener error: ${payload.listener_error}`)
  }

  const previousErrors = new Set((previous?.recent_errors ?? []).map(describeError))
  for (const error of (payload.recent_errors ?? []).filter((error) => !previousErrors.has(describeError(error)))) {
    append('error', `Backend error: ${describeError(error)}`, error)
  }
}

// The backend emits a named heartbeat every two seconds. Allow four missed heartbeats
// before declaring the stream stale.
export function useDraftStream(leagueId: string, season: number, limit = 10): DraftStreamState {
  const [status, setStatus] = useState<DraftStatusResponse | null>(null)
  const [connected, setConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'reconnecting'>('idle')
  const [reconnectCount, setReconnectCount] = useState(0)
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<number | null>(null)
  const [lastPickAt, setLastPickAt] = useState<number | null>(null)
  const [stale, setStale] = useState(false)
  const { entries: diagnostics, append } = useDiagnosticsLog()
  const lastHeartbeatRef = useRef<number | null>(null)
  const sseArrivedRef = useRef(false)
  const hasConnectedRef = useRef(false)
  const reconnectPendingRef = useRef(false)
  const reconnectCountRef = useRef(0)
  const staleRef = useRef(false)
  const connectionStateRef = useRef<'idle' | 'connecting' | 'connected' | 'reconnecting'>('idle')
  const previousStatusRef = useRef<DraftStatusResponse | null>(null)

  useEffect(() => {
    function updateConnectionState(nextState: 'idle' | 'connecting' | 'connected' | 'reconnecting', nextReconnectCount = reconnectCountRef.current) {
      const changed = connectionStateRef.current !== nextState || reconnectCountRef.current !== nextReconnectCount
      connectionStateRef.current = nextState
      reconnectCountRef.current = nextReconnectCount
      if (!changed) return
      const level: DiagnosticsLevel = nextState === 'reconnecting' ? 'warn' : 'info'
      append(level, `Draft stream ${nextState}`, { league_id: leagueId, season, reconnect_count: nextReconnectCount })
    }

    if (!leagueId || !season) {
      setStatus(null)
      setConnected(false)
      setConnectionState('idle')
      setReconnectCount(0)
      setLastHeartbeatAt(null)
      setLastPickAt(null)
      setStale(false)
      lastHeartbeatRef.current = null
      sseArrivedRef.current = false
      hasConnectedRef.current = false
      reconnectPendingRef.current = false
      reconnectCountRef.current = 0
      staleRef.current = false
      previousStatusRef.current = null
      updateConnectionState('idle', 0)
      return
    }

    // Track whether an SSE event arrived and cleanup status
    sseArrivedRef.current = false
    hasConnectedRef.current = false
    reconnectPendingRef.current = false
    reconnectCountRef.current = 0
    staleRef.current = false
    previousStatusRef.current = null
    lastHeartbeatRef.current = null
    // A previous subscription may have left this true; the new EventSource is not open yet,
    // so keep it false until this subscription's own onopen fires.
    setConnected(false)
    setConnectionState('connecting')
    setReconnectCount(0)
    setLastHeartbeatAt(null)
    setLastPickAt(null)
    setStale(false)
    updateConnectionState('connecting', 0)
    let isEffectActive = true

    function acceptStatus(payload: DraftStatusResponse, source: 'snapshot' | 'sse') {
      // The first payload of a subscription is a baseline, not an observation. Its picks
      // already happened - possibly hours ago, possibly in a draft that has since finished -
      // and DraftPickSummary carries no timestamp, so their real age is unknowable here.
      // Comparing them against an empty set reported every one as landing "0s ago", which is
      // precisely the lie this field exists to prevent: it is the number you check to find
      // out whether the feed has gone quiet. Left unknown until a pick actually arrives.
      const isBaseline = previousStatusRef.current === null
      const previousPickKeys = new Set((previousStatusRef.current?.recent_picks ?? []).map(pickKey))
      if (!isBaseline && payload.recent_picks.some((pick) => !previousPickKeys.has(pickKey(pick)))) {
        setLastPickAt(Date.now())
      }
      appendStatusDiagnostics(payload, previousStatusRef.current, source, append)
      previousStatusRef.current = payload
      setStatus(payload)
    }

    function markStreamAlive() {
      lastHeartbeatRef.current = Date.now()
      setLastHeartbeatAt(lastHeartbeatRef.current)
      staleRef.current = false
      setStale(false)
    }

    // Seed from snapshot first so reconnects show the latest known picks immediately.
    void getDraftStatus(leagueId, season, limit)
      .then((snapshot) => {
        // Ignore snapshot result if SSE already fired or effect was cleaned up
        if (!isEffectActive || sseArrivedRef.current) return
        acceptStatus(snapshot, 'snapshot')
      })
      .catch((err: unknown) => {
        append('warn', 'Draft status snapshot failed; waiting for SSE', err instanceof Error ? err.message : String(err))
      })

    const params = new URLSearchParams({ league_id: leagueId, season: String(season), limit: String(limit) })
    const source = new EventSource(`/v1/draft/stream?${params}`)

    source.onopen = () => {
      setConnected(true)
      markStreamAlive()
      let nextReconnectCount = reconnectCountRef.current
      if (reconnectPendingRef.current) {
        nextReconnectCount += 1
        setReconnectCount(nextReconnectCount)
        reconnectPendingRef.current = false
      }
      setConnectionState('connected')
      updateConnectionState('connected', nextReconnectCount)
      hasConnectedRef.current = true
    }
    source.onerror = () => {
      const nextState = hasConnectedRef.current ? 'reconnecting' : 'connecting'
      setConnected(false)
      setConnectionState(nextState)
      if (hasConnectedRef.current) reconnectPendingRef.current = true
      updateConnectionState(nextState)
    }
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as DraftStatusResponse
        // Only suppress the snapshot seed once a usable event has actually parsed - a
        // malformed payload must not blank out the dashboard.
        sseArrivedRef.current = true
        acceptStatus(payload, 'sse')
        markStreamAlive()
      } catch (err) {
        append('error', 'Failed to parse draft status SSE event', {
          error: err instanceof Error ? err.message : String(err),
          data: event.data,
        })
        // Malformed payload - skip this event, keep the connection open for the next one.
      }
    }
    source.addEventListener('heartbeat', markStreamAlive)

    const staleCheck = window.setInterval(() => {
      if (lastHeartbeatRef.current !== null && Date.now() - lastHeartbeatRef.current > STALE_AFTER_MS) {
        if (!staleRef.current) {
          staleRef.current = true
          append('warn', 'Draft stream stale', {
            league_id: leagueId,
            season,
            seconds_since_heartbeat: Math.round((Date.now() - lastHeartbeatRef.current) / 1000),
          })
        }
        setStale(true)
      }
    }, HEARTBEAT_INTERVAL_MS)

    return () => {
      isEffectActive = false
      source.close()
      window.clearInterval(staleCheck)
    }
  }, [leagueId, season, limit, append])

  return { status, connected, connectionState, reconnectCount, lastHeartbeatAt, lastPickAt, stale, diagnostics }
}

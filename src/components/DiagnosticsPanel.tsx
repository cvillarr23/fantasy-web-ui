import { useState } from 'react'
import { Button, Skeleton } from '@mantine/core'
import type { DraftStatusResponse } from '../api/types'
import type { DiagnosticsLogEntry } from '../hooks/useDiagnosticsLog'
import { formatDiagnosticsDetail, formatDiagnosticsEntry } from '../hooks/useDiagnosticsLog'

const COLLAPSED_STORAGE_KEY = 'fantasy-web-ui.diagnostics-collapsed'

interface Props {
  status: DraftStatusResponse | null
  connectionState: 'idle' | 'connecting' | 'connected' | 'reconnecting'
  reconnectCount: number
  stale: boolean
  entries: DiagnosticsLogEntry[]
  loading?: boolean
}

function loadCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function formatDisplayTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function summarizeRecentError(error: Record<string, unknown>): string {
  for (const key of ['message', 'error', 'exception', 'detail']) {
    const value = error[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return formatDiagnosticsDetail(error)
}

export function DiagnosticsPanel({ status, connectionState, reconnectCount, stale, entries, loading = false }: Props) {
  const [collapsed, setCollapsed] = useState(loadCollapsed)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const recentErrors = status?.recent_errors ?? []

  function handleToggle() {
    const next = !collapsed
    setCollapsed(next)
    try {
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0')
    } catch {
      // Private-mode browsers can reject writes; diagnostics should still be visible.
    }
  }

  async function handleCopy() {
    const summary = [
      `connection=${stale ? 'stale' : connectionState}`,
      `reconnects=${reconnectCount}`,
      `listener_state=${status?.listener_state ?? '—'}`,
      `job_state=${status?.job_state ?? '—'}`,
      `pipeline_health=${status?.pipeline_health ?? '—'}`,
      `listener_last_event_at=${status?.listener_last_event_at ?? '—'}`,
      status?.listener_error ? `listener_error=${status.listener_error}` : null,
      recentErrors.length > 0 ? `recent_errors=${formatDiagnosticsDetail(recentErrors)}` : null,
    ]
      .filter(Boolean)
      .join('\n')
    const text = [`Draft diagnostics`, summary, '', ...entries.map(formatDiagnosticsEntry)].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopyMessage('Copied')
    } catch {
      setCopyMessage('Copy failed')
    }
  }

  return (
    <section className={`diagnostics-panel ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="diagnostics-header">
        <div>
          <h2>Diagnostics</h2>
          {loading ? (
            <Skeleton height={12} width="80%" />
          ) : (
            <p className="diagnostics-summary">
              Listener {status?.listener_state ?? '—'} · Job {status?.job_state ?? '—'} · Health {status?.pipeline_health ?? '—'} ·{' '}
              Connection {stale ? 'stale' : connectionState} · Reconnects {reconnectCount} · Last listener event{' '}
              {formatDisplayTime(status?.listener_last_event_at)}
            </p>
          )}
        </div>
        <div className="diagnostics-actions">
          <Button size="xs" variant="default" onClick={handleCopy} disabled={entries.length === 0 && !status}>
            Copy
          </Button>
          <Button size="xs" variant="default" onClick={handleToggle} aria-expanded={!collapsed}>
            {collapsed ? 'Show' : 'Hide'}
          </Button>
        </div>
      </div>
      {copyMessage && <p className="diagnostics-copy-status">{copyMessage}</p>}
      {status?.listener_error && <p className="diagnostics-alert">Listener error: {status.listener_error}</p>}
      {recentErrors.length > 0 && (
        <div className="diagnostics-recent-errors">
          <h3>Recent backend errors</h3>
          <ul>
            {recentErrors.map((error, index) => (
              <li key={index}>{summarizeRecentError(error)}</li>
            ))}
          </ul>
        </div>
      )}
      {!collapsed && (
        <ol className="diagnostics-log">
          {entries.length === 0 ? (
            <li className="muted">No diagnostics yet.</li>
          ) : (
            entries.map((entry) => (
              <li key={entry.id} className={`diagnostics-entry diagnostics-${entry.level}`}>
                <span className="diagnostics-time">{formatDisplayTime(entry.timestamp)}</span>
                <span className="diagnostics-level">{entry.level}</span>
                <span className="diagnostics-message">{entry.message}</span>
                {entry.detail !== undefined && <pre>{formatDiagnosticsDetail(entry.detail)}</pre>}
              </li>
            ))
          )}
        </ol>
      )}
    </section>
  )
}

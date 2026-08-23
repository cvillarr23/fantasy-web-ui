import { useCallback, useRef, useState } from 'react'

export type DiagnosticsLevel = 'info' | 'warn' | 'error'

export interface DiagnosticsLogEntry {
  id: number
  timestamp: string
  level: DiagnosticsLevel
  message: string
  detail?: unknown
}

const DEFAULT_MAX_ENTRIES = 200
const CONSOLE_PREFIX = '[draft]'

export function formatDiagnosticsDetail(detail: unknown): string {
  if (detail === undefined || detail === null) return ''
  if (typeof detail === 'string') return detail
  try {
    return JSON.stringify(detail, null, 2)
  } catch {
    return String(detail)
  }
}

export function formatDiagnosticsEntry(entry: DiagnosticsLogEntry): string {
  const detail = formatDiagnosticsDetail(entry.detail)
  return `${entry.timestamp} ${entry.level.toUpperCase()} ${entry.message}${detail ? `\n${detail}` : ''}`
}

export function useDiagnosticsLog(maxEntries = DEFAULT_MAX_ENTRIES) {
  const [entries, setEntries] = useState<DiagnosticsLogEntry[]>([])
  const nextIdRef = useRef(1)

  const append = useCallback(
    (level: DiagnosticsLevel, message: string, detail?: unknown) => {
      const entry: DiagnosticsLogEntry = {
        id: nextIdRef.current,
        timestamp: new Date().toISOString(),
        level,
        message,
        detail,
      }
      nextIdRef.current += 1

      const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info
      if (detail === undefined) {
        consoleMethod(`${CONSOLE_PREFIX} ${message}`)
      } else {
        consoleMethod(`${CONSOLE_PREFIX} ${message}`, detail)
      }

      setEntries((current) => [entry, ...current].slice(0, maxEntries))
    },
    [maxEntries],
  )

  return { entries, append }
}

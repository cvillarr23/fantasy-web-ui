import { statusLabel } from '../runFormat'

const TONES: Record<string, string> = {
  success: 'success',
  failure: 'failure',
  timeout: 'failure',
  running: 'running',
  queued: 'queued',
}

/** A status badge for these light surfaces. Unknown or quiet statuses stay neutral. */
export function RunStatusText({ status, label }: { status: string; label?: string }) {
  return <span className={`job-status job-status-${TONES[status] ?? 'neutral'}`}>{label ?? statusLabel(status)}</span>
}

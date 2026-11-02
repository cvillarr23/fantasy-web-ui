import { Link, useLocation } from 'react-router-dom'
import type { ChildRun, LlmSessionRef } from '../../api/runs'
import { duration, isActiveRun, runLabel, runStamp, skipReason } from '../runFormat'
import { RunStatusText } from './RunStatusText'

function childMeta(run: ChildRun) {
  const when = runStamp(run.started_at)
  const length = isActiveRun(run.status) ? '' : ` · ${duration(run)}`
  const reason = skipReason(run)
  return `${when}${length}${reason && ` · ${reason}`}`
}

function SessionChip({ session }: { session: LlmSessionRef }) {
  return (
    <Link className="run-session-chip" to={`/activity/sessions/${encodeURIComponent(session.id)}`} aria-label={`Open LLM session: ${session.title}`}>
      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 3.5h11v7.5H7l-3 2.5V11H2.5z" />
      </svg>
      <span>{session.title}</span>
      <small>LLM session</small>
    </Link>
  )
}

/** Runs this run led to, each with any LLM sessions behind it. */
export function ChildRunList({ runs }: { runs: ChildRun[] }) {
  const { state } = useLocation()
  return (
    <ul className="child-runs">
      {runs.map((run) => (
        <li key={run.id}>
          <RunStatusText status={run.status} />
          <Link className="child-run-name" to={`/activity/runs/${run.id}`} state={state}>{runLabel(run.job_name)}</Link>
          <small>{childMeta(run)}</small>
          {run.llm_sessions?.map((session) => <SessionChip key={session.id} session={session} />)}
        </li>
      ))}
    </ul>
  )
}

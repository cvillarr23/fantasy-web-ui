import type { RunSummary } from '../../api/runs'
import { duration, isActiveRun, runLabel, runStamp, statusLabel } from '../runFormat'

interface Stage {
  title: string
  when: string
  note: string
  tone: string
}

const NEVER_STARTED = new Set(['skipped'])
const FAILED = new Set(['failure', 'timeout'])

function requestedStage(run: RunSummary): Stage {
  return {
    title: 'Scheduled',
    when: run.scheduled_for ? runStamp(run.scheduled_for) : '—',
    note: 'Slot this run was asked for',
    tone: 'neutral',
  }
}

function startedStage(run: RunSummary): Stage {
  if (run.status === 'queued') return { title: 'Queued', when: '—', note: 'Waiting to start', tone: 'queued' }
  if (NEVER_STARTED.has(run.status)) return { title: 'Not started', when: '—', note: '', tone: 'neutral' }
  return { title: 'Started', when: runStamp(run.started_at), note: 'Latest attempt', tone: 'running' }
}

function endedStage(run: RunSummary): Stage {
  if (isActiveRun(run.status) || !run.finished_at) return { title: 'Not finished', when: '—', note: '', tone: 'neutral' }
  const length = NEVER_STARTED.has(run.status) ? '' : ` · ${duration(run)}`
  return {
    title: `Ended: ${statusLabel(run.status)}`,
    when: `${runStamp(run.finished_at)}${length}`,
    note: run.end_reason ? `Reason: ${runLabel(run.end_reason)}` : '',
    tone: FAILED.has(run.status) ? 'failure' : run.status === 'success' ? 'success' : 'neutral',
  }
}

/** The moments run_log keeps for a run. It holds no state history, and starting a run
 * overwrites `started_at`, so this is all a timeline can truthfully show. */
export function RunTimeline({ run }: { run: RunSummary }) {
  const stages = [requestedStage(run), startedStage(run), endedStage(run)]
  return (
    <section aria-labelledby="run-timeline" className="job-panel">
      <h3 id="run-timeline">Status timeline</h3>
      <ol className="run-timeline">
        {stages.map((stage) => (
          <li key={stage.title} className={`run-stage run-stage-${stage.tone}`}>
            <strong>{stage.title}</strong>
            <span>{stage.when}</span>
            {stage.note && <small>{stage.note}</small>}
          </li>
        ))}
      </ol>
    </section>
  )
}

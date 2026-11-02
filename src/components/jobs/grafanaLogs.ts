const MARGIN_MS = 60_000
const LOKI = { type: 'loki', uid: 'loki' }

interface LoggedRun {
  k8s_job?: string | null
  started_at: string
  finished_at?: string | null
}

function logRange(run: LoggedRun) {
  const from = String(Date.parse(run.started_at) - MARGIN_MS)
  const to = run.finished_at ? String(Date.parse(run.finished_at) + MARGIN_MS) : 'now'
  return { from, to }
}

function explorePane(k8sJob: string, run: LoggedRun) {
  return {
    a: {
      datasource: LOKI.uid,
      queries: [{ refId: 'A', expr: `{namespace="default", pod=~"${k8sJob}-.*"}`, queryType: 'range', datasource: LOKI }],
      range: logRange(run),
    },
  }
}

/** Grafana Explore for a run's pod and time range. Null without a configured Grafana, and
 * for inline runs, which have no pod to filter on. */
export function grafanaLogsUrl(base: string, run: LoggedRun, { embed = false } = {}) {
  if (!base || !run.k8s_job) return null
  const params = new URLSearchParams({ schemaVersion: '1', orgId: '1', panes: JSON.stringify(explorePane(run.k8s_job, run)) })
  if (embed) params.set('kiosk', 'true')
  return `${base.replace(/\/+$/, '')}/explore?${params}`
}

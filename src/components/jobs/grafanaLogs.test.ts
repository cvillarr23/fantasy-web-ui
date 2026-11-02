import { describe, expect, it } from 'vitest'
import { grafanaLogsUrl } from './grafanaLogs'

const run = {
  k8s_job: 'sample-job-abc123-a1',
  started_at: '2026-11-03T22:00:00Z',
  finished_at: '2026-11-03T22:05:00Z',
}

function pane(url: string) {
  const parsed = new URL(url)
  return { parsed, query: JSON.parse(parsed.searchParams.get('panes')!).a }
}

describe('grafanaLogsUrl', () => {
  it('opens Explore on the base address, with or without a trailing slash', () => {
    expect(new URL(grafanaLogsUrl('https://grafana.example/', run)!).pathname).toBe('/explore')
    expect(new URL(grafanaLogsUrl('https://grafana.example', run)!).pathname).toBe('/explore')
  })

  it('filters the logs to the run pod', () => {
    expect(pane(grafanaLogsUrl('https://grafana.example', run)!).query.queries[0].expr).toBe(
      '{namespace="default", pod=~"sample-job-abc123-a1-.*"}',
    )
  })

  it('covers the run time range with a minute either side', () => {
    expect(pane(grafanaLogsUrl('https://grafana.example', run)!).query.range).toEqual({
      from: String(Date.parse('2026-11-03T21:59:00Z')),
      to: String(Date.parse('2026-11-03T22:06:00Z')),
    })
  })

  it('runs up to now while the run is active', () => {
    const active = { ...run, finished_at: null }
    expect(pane(grafanaLogsUrl('https://grafana.example', active)!).query.range.to).toBe('now')
  })

  it('has no link without a Grafana address', () => {
    expect(grafanaLogsUrl('', run)).toBeNull()
  })

  it('has no link for an inline run, which has no pod', () => {
    expect(grafanaLogsUrl('https://grafana.example', { ...run, k8s_job: null })).toBeNull()
  })

  it('adds kiosk mode for the embedded panel', () => {
    expect(grafanaLogsUrl('https://grafana.example', run, { embed: true })).toContain('kiosk')
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { ChildRunList } from './ChildRunList'
import { runDetailFixture } from './fixtures'
import { GrafanaLogs } from './GrafanaLogs'
import { renderForTest } from './renderForTest'
import { RunTimeline } from './RunTimeline'

afterEach(cleanup)

describe('RunTimeline', () => {
  const stages = () => screen.getAllByRole('listitem').map((item) => item.textContent)

  it('shows the slot, the start and how the run ended', () => {
    renderForTest(<RunTimeline run={runDetailFixture} />)
    expect(stages()[0]).toContain('Scheduled')
    expect(stages()[1]).toContain('Started')
    expect(stages()[2]).toContain('Ended: Failure')
    expect(stages()[2]).toContain('2m 4s')
    expect(stages()[2]).toContain('Reason: exit code')
  })

  it('shows a dash for a manual run with no slot', () => {
    renderForTest(<RunTimeline run={{ ...runDetailFixture, scheduled_for: null }} />)
    expect(stages()[0]).toContain('—')
  })

  it('shows a queued run as not started', () => {
    renderForTest(<RunTimeline run={{ ...runDetailFixture, status: 'queued', finished_at: null, end_reason: null }} />)
    expect(stages()[1]).toContain('Queued')
    expect(stages()[2]).toContain('Not finished')
  })

  it('shows a running run as unfinished', () => {
    renderForTest(<RunTimeline run={{ ...runDetailFixture, status: 'running', finished_at: null, end_reason: null }} />)
    expect(stages()[1]).toContain('Started')
    expect(stages()[2]).toContain('Not finished')
  })

  it('shows a skipped run as never started', () => {
    renderForTest(<RunTimeline run={{ ...runDetailFixture, status: 'skipped', end_reason: 'dependency_failed' }} />)
    expect(stages()[1]).toContain('Not started')
    expect(stages()[2]).toContain('Reason: dependency failed')
  })
})

describe('ChildRunList', () => {
  it('links each child with its status', () => {
    renderForTest(<ChildRunList runs={runDetailFixture.children} />)
    const [first] = screen.getAllByRole('listitem')
    expect(within(first).getByText('Success')).toBeTruthy()
    expect(within(first).getByRole('link', { name: 'waiver-worker' }).getAttribute('href')).toBe('/activity/runs/run-waiver-worker')
  })

  it('links an LLM session when the child has one', () => {
    renderForTest(<ChildRunList runs={runDetailFixture.children} />)
    expect(screen.getByRole('link', { name: 'Open LLM session: Sample claim reasoning' }).getAttribute('href')).toBe('/activity/sessions/session-1')
  })

  it('shows no session link for a child without one', () => {
    renderForTest(<ChildRunList runs={runDetailFixture.children} />)
    expect(screen.getAllByRole('link', { name: /Open LLM session/ })).toHaveLength(1)
  })

  it('copes with an API that sends no sessions', () => {
    renderForTest(<ChildRunList runs={[{ ...runDetailFixture.children[0], llm_sessions: undefined }]} />)
    expect(screen.queryByRole('link', { name: /Open LLM session/ })).toBeNull()
  })

  it('says why a child was skipped', () => {
    renderForTest(<ChildRunList runs={[{ ...runDetailFixture.children[0], status: 'skipped', end_reason: 'dependency_failed' }]} />)
    expect(screen.getByText(/dependency failed/)).toBeTruthy()
  })
})

describe('GrafanaLogs', () => {
  it('links out to the run logs', () => {
    renderForTest(<GrafanaLogs baseUrl="https://grafana.example" run={runDetailFixture} />)
    expect(screen.getByRole('link', { name: 'Open in Grafana' }).getAttribute('href')).toContain('https://grafana.example/explore?')
  })

  it('keeps the embed closed until asked', () => {
    renderForTest(<GrafanaLogs baseUrl="https://grafana.example" run={runDetailFixture} />)
    expect(screen.queryByTitle('Grafana logs for this run')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Show Grafana logs here' }))
    expect(screen.getByTitle('Grafana logs for this run')).toBeTruthy()
    expect(screen.getByText(/Google won't load inside a panel/)).toBeTruthy()
  })

  it('renders nothing without a Grafana address', () => {
    renderForTest(<GrafanaLogs baseUrl="" run={runDetailFixture} />)
    expect(screen.queryByRole('link', { name: 'Open in Grafana' })).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders nothing for an inline run', () => {
    renderForTest(<GrafanaLogs baseUrl="https://grafana.example" run={{ ...runDetailFixture, k8s_job: null }} />)
    expect(screen.queryByRole('link', { name: 'Open in Grafana' })).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

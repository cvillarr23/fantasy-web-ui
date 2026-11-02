import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { catalogFixture, jobFixture, pauseFixture } from './fixtures'
import { JobsTable } from './JobsTable'
import { renderForTest } from './renderForTest'

afterEach(cleanup)

function renderTable(props: Partial<Parameters<typeof JobsTable>[0]> = {}) {
  const onSelect = vi.fn()
  const onRun = vi.fn()
  renderForTest(
    <JobsTable catalog={catalogFixture} selected={null} startingJob={null} now={new Date('2026-11-03T22:22:00Z')} onSelect={onSelect} onRun={onRun} {...props} />,
  )
  return { onSelect, onRun }
}

const row = (name: string) => screen.getByRole('button', { name }).closest('tr')!

describe('JobsTable', () => {
  it('has a row per job with the columns from the mockup', () => {
    renderTable()
    expect(screen.getAllByRole('row')).toHaveLength(catalogFixture.jobs.length + 1)
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      expect.stringContaining('Job'),
      'Schedule / trigger',
      'Last run',
      'Next slot',
      'Run',
    ])
  })

  it('shows what starts a chain step instead of calling it a chain step', () => {
    renderTable()
    const cells = within(row('set-lineup'))
    expect(cells.getByText('After refresh-sample finishes')).toBeTruthy()
    expect(cells.getByText('In sample-weekly, by 7:15 PM')).toBeTruthy()
    expect(screen.queryByText('Chain step')).toBeNull()
  })

  it('shows the last run status, and a dash when there is none', () => {
    renderTable()
    expect(within(row('check-session')).getByText('Failure')).toBeTruthy()
    expect(within(row('set-lineup')).getByText('—')).toBeTruthy()
  })

  it('labels jobs that can change the team', () => {
    renderTable()
    expect(within(row('set-lineup')).getByText('Affects team')).toBeTruthy()
    expect(within(row('sync-rumors')).queryByText('Affects team')).toBeNull()
  })

  it('shows a chain step next slot as coming from its chain', () => {
    renderTable()
    expect(within(row('set-lineup')).getByText('With sample-weekly')).toBeTruthy()
  })

  it('selects a job from its name', () => {
    const { onSelect } = renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'sync-rumors' }))
    expect(onSelect).toHaveBeenCalledWith('sync-rumors')
  })

  it('marks the selected job', () => {
    renderTable({ selected: 'set-lineup' })
    expect(screen.getByRole('button', { name: 'set-lineup' }).getAttribute('aria-pressed')).toBe('true')
  })
})

describe('run button states', () => {
  const runButton = (name: string, label: string) => within(row(name)).getByRole('button', { name: label })

  it('starts a plain job straight away', () => {
    const { onRun } = renderTable()
    fireEvent.click(runButton('sync-rumors', 'Run'))
    expect(onRun).toHaveBeenCalledWith(catalogFixture.jobs[0])
  })

  it('offers the rail for a job with something to choose', () => {
    const { onRun } = renderTable()
    fireEvent.click(runButton('set-lineup', 'Run…'))
    expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ name: 'set-lineup' }))
  })

  it('disables the row while its run is starting', () => {
    renderTable({ startingJob: 'sync-rumors' })
    expect(runButton('sync-rumors', 'Starting…').hasAttribute('disabled')).toBe(true)
  })

  it('disables a job that already has a run', () => {
    renderTable()
    expect(runButton('score-sample', 'Already running').hasAttribute('disabled')).toBe(true)
  })

  it('leaves other rows enabled while one starts', () => {
    renderTable({ startingJob: 'sync-rumors' })
    expect(runButton('check-session', 'Run').hasAttribute('disabled')).toBe(false)
  })

  it('keeps a queueing job enabled while a run is active', () => {
    const queueing = jobFixture({
      name: 'queues',
      overlap: 'queue',
      last_run: { job_name: 'queues', id: 'r', status: 'running', started_at: '2026-11-03T22:00:00Z', trigger_type: 'manual' },
    })
    renderTable({ catalog: { jobs: [queueing], chains: [] } })
    expect(runButton('queues', 'Run').hasAttribute('disabled')).toBe(false)
  })

  it('offers Cancel only on a row whose last run is active', () => {
    renderTable()
    expect(within(row('score-sample')).getByRole('button', { name: 'Cancel, score-sample' })).toBeTruthy()
    expect(within(row('sync-rumors')).queryByRole('button', { name: /^Cancel/ })).toBeNull()
  })

  it('marks a paused job by its name', () => {
    const paused = { ...catalogFixture.jobs[0], pause: pauseFixture('sync-rumors') }
    renderTable({ catalog: { ...catalogFixture, jobs: [paused, ...catalogFixture.jobs.slice(1)] } })
    expect(within(row('sync-rumors')).getByText('Paused')).toBeTruthy()
    expect(within(row('sync-rumors')).getByText(/^Paused until /)).toBeTruthy()
    expect(within(row('check-session')).queryByText('Paused')).toBeNull()
  })
})

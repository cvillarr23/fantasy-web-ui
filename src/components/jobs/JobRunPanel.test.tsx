import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { ApiError } from '../../api/client'
import { catalogFixture } from './fixtures'
import { JobRunPanel } from './JobRunPanel'
import { renderForTest } from './renderForTest'

afterEach(cleanup)

const job = (name: string) => catalogFixture.jobs.find((j) => j.name === name)!

function renderPanel(props: Partial<Parameters<typeof JobRunPanel>[0]> = {}) {
  const onStart = vi.fn()
  renderForTest(<JobRunPanel job={job('set-lineup')} catalog={catalogFixture} recentRuns={[]} starting={false} error={null} started={null} onStart={onStart} {...props} />)
  return { onStart }
}

const review = () => screen.getByRole('button', { name: 'Review and run' })

describe('JobRunPanel', () => {
  it('builds a field for each allowed param', () => {
    renderPanel()
    expect(screen.getByRole('textbox', { name: 'Week (optional)' })).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Dry run' })).toBeTruthy()
  })

  it('has no parameter section for a job with none', () => {
    renderPanel({ job: job('sync-rumors') })
    expect(screen.queryByText('Parameters')).toBeNull()
  })

  it('asks for confirmation before starting a job that acts', () => {
    const { onStart } = renderPanel()
    fireEvent.click(review())
    expect(onStart).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('sends only the params that were filled in, after confirming', () => {
    const { onStart } = renderPanel()
    fireEvent.change(screen.getByRole('textbox', { name: 'Week (optional)' }), { target: { value: '7' } })
    fireEvent.click(review())
    fireEvent.click(screen.getByRole('checkbox', { name: /checked what this run/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Start run' }))
    expect(onStart).toHaveBeenCalledWith({ params: { week: 7 }, downstream: false })
  })

  it('offers downstream only for a step with later steps', () => {
    renderPanel({ job: job('claim-waivers') })
    expect(screen.queryByRole('checkbox', { name: 'With downstream' })).toBeNull()
  })

  it('names the steps downstream would add', () => {
    renderPanel({ job: job('refresh-sample') })
    expect(screen.getByText('Then runs set-lineup, claim-waivers from sample-weekly.')).toBeTruthy()
  })

  it('starts a quiet step at once, without downstream by default', () => {
    const { onStart } = renderPanel({ job: job('sync-sample') })
    fireEvent.click(screen.getByRole('button', { name: 'Run' }))
    expect(onStart).toHaveBeenCalledWith({ params: {}, downstream: false })
  })

  it('confirms a quiet step when downstream reaches a step that acts', () => {
    const { onStart } = renderPanel({ job: job('sync-sample') })
    fireEvent.click(screen.getByRole('checkbox', { name: 'With downstream' }))
    fireEvent.click(review())
    expect(onStart).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('blocks a job that is already running and links its run', () => {
    renderPanel({ job: job('score-sample') })
    expect(screen.getByRole('button', { name: 'Already running' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('link', { name: 'Open the run' }).getAttribute('href')).toBe('/activity/runs/run-score-sample')
  })

  it('explains a 409 and links the active run', () => {
    renderPanel({ job: job('score-sample'), error: new ApiError(409, "A run for 'score-sample' is already running") })
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Run not started')
    expect(alert.textContent).toContain('score-sample already has a run in progress, and it allows one at a time.')
    expect(screen.getByRole('link', { name: 'Open the active run' })).toBeTruthy()
  })

  it('shows the API message for any other refusal', () => {
    renderPanel({ error: new ApiError(422, 'week must be an integer') })
    expect(screen.getByRole('alert').textContent).toContain('Run not started: week must be an integer')
  })

  it('says a started run is queued, not done, and links it', () => {
    renderPanel({ started: { job: 'set-lineup', runId: 'run-9' } })
    expect(screen.getByRole('status').textContent).toContain("it hasn't started yet")
    expect(screen.getByRole('link', { name: 'Watch this run' }).getAttribute('href')).toBe('/activity/runs/run-9')
  })

  it('holds back a job with a required param still blank', () => {
    const needsLabel = { ...job('sync-rumors'), params: { label: 'string' } }
    const { onStart } = renderPanel({ job: needsLabel })
    const run = screen.getByRole('button', { name: 'Run' })
    expect(run.hasAttribute('disabled')).toBe(true)
    fireEvent.click(run)
    expect(onStart).not.toHaveBeenCalled()
  })

  it('lists recent runs', () => {
    renderPanel({
      recentRuns: [{ id: 'r1', job_name: 'set-lineup', trigger_type: 'manual', status: 'success', started_at: '2026-10-27T21:01:00Z', trigger: {}, summary: {}, input_count: 0, output_count: 0, llm_count: 0 }],
    })
    expect(screen.getByRole('link', { name: /Success/ }).getAttribute('href')).toBe('/activity/runs/r1')
  })

  it('says when a job has no runs', () => {
    renderPanel()
    expect(screen.getByText('No runs recorded yet.')).toBeTruthy()
  })
})

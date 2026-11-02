import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { catalogFixture, chainFixture, chainRootFixture, pauseFixture } from './fixtures'
import { chainStepStates } from './chainStatus'
import { ChainGraph } from './ChainGraph'
import { ChainStepList } from './ChainStepList'
import { renderForTest } from './renderForTest'

afterEach(cleanup)

function renderGraph(onSelect = vi.fn(), root = chainRootFixture) {
  const { container } = renderForTest(
    <ChainGraph chain={chainFixture} jobs={catalogFixture.jobs} states={chainStepStates(chainFixture, root)} selected={null} onSelect={onSelect} />,
  )
  return { container, onSelect }
}

const node = (step: string) => screen.getByRole('button', { name: new RegExp(`^${step}`) })

describe('ChainGraph', () => {
  it('draws a node for every step', () => {
    renderGraph()
    for (const step of Object.keys(chainFixture.steps)) expect(node(step)).toBeTruthy()
  })

  it('shows each step status in words', () => {
    renderGraph()
    expect(within(node('sync-sample')).getByText('Success')).toBeTruthy()
    expect(within(node('score-sample')).getByText('Running')).toBeTruthy()
    expect(within(node('set-lineup')).getByText('Waiting')).toBeTruthy()
  })

  it('flags steps that can change the team', () => {
    renderGraph()
    expect(within(node('set-lineup')).getByText('Affects team')).toBeTruthy()
    expect(within(node('sync-sample')).queryByText('Affects team')).toBeNull()
  })

  it('shows the latest start time on a step that has one', () => {
    renderGraph()
    expect(within(node('set-lineup')).getByText('Starts by 7:15 PM')).toBeTruthy()
  })

  it('draws the edges with what each one waits for', () => {
    const { container } = renderGraph()
    expect(container.querySelectorAll('.react-flow__edge')).toHaveLength(4)
    expect(screen.getByText('success')).toBeTruthy()
    expect(screen.getAllByText('finish')).toHaveLength(3)
  })

  it('selects the job behind a step', () => {
    const { onSelect } = renderGraph()
    fireEvent.click(node('set-lineup'))
    expect(onSelect).toHaveBeenCalledWith('set-lineup')
  })

  it('renders a chain that has never run', () => {
    renderForTest(<ChainGraph chain={chainFixture} jobs={catalogFixture.jobs} states={chainStepStates(chainFixture, null)} selected={null} onSelect={vi.fn()} />)
    expect(screen.getAllByText('No run yet')).toHaveLength(Object.keys(chainFixture.steps).length)
  })

  it('offers Cancel on the running step only, and keeps the step selectable', () => {
    const { onSelect } = renderGraph()
    expect(screen.getByRole('button', { name: 'Cancel, score-sample' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Cancel,/ })).toHaveLength(1)
    fireEvent.click(node('score-sample'))
    expect(onSelect).toHaveBeenCalledWith('score-sample')
  })

  it('marks a paused step', () => {
    const jobs = catalogFixture.jobs.map((job) => (job.name === 'set-lineup' ? { ...job, pause: pauseFixture('set-lineup', null) } : job))
    renderForTest(<ChainGraph chain={chainFixture} jobs={jobs} states={chainStepStates(chainFixture, chainRootFixture)} selected={null} onSelect={vi.fn()} />)
    expect(within(node('set-lineup')).getByText('Paused')).toBeTruthy()
    expect(node('set-lineup').getAttribute('aria-label')).toContain('paused')
    expect(within(node('sync-sample')).queryByText('Paused')).toBeNull()
  })
})

describe('ChainStepList', () => {
  it('lists the steps in order with their status and edge', () => {
    renderForTest(<ChainStepList chain={chainFixture} jobs={catalogFixture.jobs} states={chainStepStates(chainFixture, chainRootFixture)} onSelect={vi.fn()} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(5)
    expect(within(items[1]).getByText('Running')).toBeTruthy()
    expect(within(items[1]).getByText(/^After sync-sample succeeds/)).toBeTruthy()
    expect(within(items[3]).getByText(/Starts by 7:15 PM/)).toBeTruthy()
  })

  it('offers Cancel on the running step and marks a paused one', () => {
    const jobs = catalogFixture.jobs.map((job) => (job.name === 'set-lineup' ? { ...job, pause: pauseFixture('set-lineup', null) } : job))
    renderForTest(<ChainStepList chain={chainFixture} jobs={jobs} states={chainStepStates(chainFixture, chainRootFixture)} onSelect={vi.fn()} />)
    const items = screen.getAllByRole('listitem')
    expect(within(items[1]).getByRole('button', { name: 'Cancel, score-sample' })).toBeTruthy()
    expect(within(items[3]).getByText('Paused')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Cancel,/ })).toHaveLength(1)
  })
})

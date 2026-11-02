import { describe, expect, it } from 'vitest'
import { chainFixture, chainRootFixture } from './fixtures'
import { chainProgress, chainStepStates } from './chainStatus'

const status = (root = chainRootFixture) =>
  Object.fromEntries(chainStepStates(chainFixture, root).map((s) => [s.step, s.status]))

describe('chainStepStates', () => {
  it('takes each step status from the chain run, not from the job last run', () => {
    expect(status()).toMatchObject({ 'sync-sample': 'success', 'score-sample': 'running' })
  })

  it('shows steps with no run yet as waiting while the chain runs', () => {
    expect(status()['set-lineup']).toBe('waiting')
  })

  it('shows skipped steps as skipped', () => {
    const children = [...chainRootFixture.children, { ...chainRootFixture.children[0], id: 'r3', job_name: 'set-lineup', status: 'skipped' as const }]
    expect(status({ ...chainRootFixture, children })['set-lineup']).toBe('skipped')
  })

  it('shows steps the chain never reached as not run once it ended', () => {
    expect(status({ ...chainRootFixture, status: 'cancelled' })['claim-waivers']).toBe('not_run')
  })

  it('marks steps upstream of a manual start as not in this run', () => {
    const root = { ...chainRootFixture, trigger: { from_step: 'refresh-sample' }, children: [] }
    expect(status(root)).toEqual({
      'sync-sample': 'not_in_run',
      'score-sample': 'not_in_run',
      'refresh-sample': 'waiting',
      'set-lineup': 'waiting',
      'claim-waivers': 'waiting',
    })
  })

  it('shows every step as no run before the chain has ever run', () => {
    expect(new Set(chainStepStates(chainFixture, null).map((s) => s.status))).toEqual(new Set(['no_run']))
  })

  it('returns the run for a step that has one', () => {
    const [first] = chainStepStates(chainFixture, chainRootFixture)
    expect(first.run?.id).toBe('run-sync-sample')
  })

  it('keeps dependency order whatever order the catalog lists steps in', () => {
    const reversed = { ...chainFixture, steps: Object.fromEntries(Object.entries(chainFixture.steps).reverse()) }
    expect(chainStepStates(reversed, null).map((s) => s.step)).toEqual(Object.keys(chainFixture.steps))
  })
})

describe('chainProgress', () => {
  it('names the step in progress', () => {
    expect(chainProgress(chainFixture, chainRootFixture)).toBe('Running · step 2 of 5')
  })

  it('reports how a finished chain ended', () => {
    expect(chainProgress(chainFixture, { ...chainRootFixture, status: 'failure' })).toBe('Failure')
  })

  it('says when the chain has never run', () => {
    expect(chainProgress(chainFixture, null)).toBe('No run yet')
  })
})

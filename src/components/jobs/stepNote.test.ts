import { describe, expect, it } from 'vitest'
import { chainFixture, chainRootFixture } from './fixtures'
import { stepNote } from './stepNote'

const waitingRun = { ...chainRootFixture.children[0], status: 'waiting' as const, expires_at: '2026-11-04T22:00:00Z' }

describe('stepNote', () => {
  it('shows what an approval step asks and when it expires', () => {
    const step = { ...chainFixture.steps['set-lineup'], approval: { title: 'Approve lineup changes', timeout_seconds: 86_400 } }
    const note = stepNote({ step: 'set-lineup', status: 'waiting', run: waitingRun }, step)
    expect(note).toMatch(/^Approve lineup changes · Expires /)
  })

  it('still reads when the catalog has no title for the step', () => {
    expect(stepNote({ step: 'set-lineup', status: 'waiting', run: { ...waitingRun, expires_at: null } }, chainFixture.steps['set-lineup'])).toBe('Needs your approval')
  })
})

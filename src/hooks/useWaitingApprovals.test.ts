import { describe, expect, it } from 'vitest'
import { waitingCount } from './useWaitingApprovals'

describe('waitingCount', () => {
  it('is unknown until the list loads', () => {
    expect(waitingCount(undefined)).toBeUndefined()
  })

  it('counts the waiting approvals', () => {
    expect(waitingCount([])).toBe('0')
    expect(waitingCount([{}, {}])).toBe('2')
  })

  it('says there may be more when the page is full', () => {
    expect(waitingCount(Array.from({ length: 100 }, () => ({})))).toBe('100+')
  })
})

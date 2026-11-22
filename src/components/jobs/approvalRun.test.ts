import { describe, expect, it } from 'vitest'
import { approvalEnding, approvalLink, approvalThen, decidableHere, thenText } from './approvalRun'

const waiting = { executor: 'approval', status: 'waiting' as const, trigger: { title: 'Approve it' } }

describe('approvalLink', () => {
  it('follows an in-app route with the router', () => {
    expect(approvalLink({ trigger: { link: '/trades?offer=abc' } })).toEqual({ href: '/trades?offer=abc', internal: true })
  })

  it('opens an http address as an ordinary link', () => {
    expect(approvalLink({ trigger: { link: 'https://example.com/review' } })).toEqual({ href: 'https://example.com/review', internal: false })
  })

  it.each(['javascript:alert(1)', '//evil.example/x', 'data:text/html,hi', '', undefined])('drops %s', (link) => {
    expect(approvalLink({ trigger: { link } })).toBeNull()
  })
})

describe('approvalThen', () => {
  it('reads the run an approval starts', () => {
    expect(approvalThen({ trigger: { then: { job: 'trade-submit', params: { offer_key: 'k' } } } })).toEqual({ job: 'trade-submit', params: { offer_key: 'k' } })
  })

  it('is null for a step that only gates the chain', () => {
    expect(approvalThen({ trigger: { then: null } })).toBeNull()
    expect(approvalThen({ trigger: {} })).toBeNull()
  })
})

describe('decidableHere', () => {
  it('offers Approve and Dismiss to a waiting approval with no link', () => {
    expect(decidableHere(waiting)).toBe(true)
  })

  it('leaves trade approvals to the Trades page', () => {
    expect(decidableHere({ ...waiting, trigger: { link: '/trades?offer=k' } })).toBe(false)
  })

  it('leaves an approval that gates a trade send to the Trades page even without a link', () => {
    expect(decidableHere({ ...waiting, trigger: { then: { job: 'trade-submit', params: { offer_key: 'k' } } } })).toBe(false)
  })

  it('still offers the buttons when approving starts some other run', () => {
    expect(decidableHere({ ...waiting, trigger: { then: { job: 'set-lineup', params: {} } } })).toBe(true)
  })

  it('offers nothing once the approval has ended or for an ordinary run', () => {
    expect(decidableHere({ ...waiting, status: 'success' as never })).toBe(false)
    expect(decidableHere({ ...waiting, executor: 'pod' })).toBe(false)
  })
})

describe('approvalEnding and thenText', () => {
  it('words how an approval ended', () => {
    expect(approvalEnding({ status: 'skipped', end_reason: 'expired' })).toBe('Expired before anyone decided')
    expect(approvalEnding({ status: 'waiting', end_reason: null })).toBe('')
  })

  it('shows the params the approved run will get', () => {
    expect(thenText({ job: 'set-lineup', params: { week: 9 } })).toBe('set-lineup (week: 9)')
    expect(thenText({ job: 'sync', params: {} })).toBe('sync')
  })
})

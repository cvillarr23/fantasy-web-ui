import { expect, it } from 'vitest'
import { actionReason, outcomeCopy, reviewSignature, retryProven } from './inboxState'
import { config, offer } from './inboxFixtures'
it('accept requires current finite non-stale fingerprint evidence; decline does not', () => {
  expect(actionReason(offer, config, 5, 'accept')).toBeNull()
  for (const score of [
    null,
    { ...offer.score!, stale: true },
    { ...offer.score!, as_of_week: 4 },
    { ...offer.score!, final_score: null },
    { ...offer.score!, scored_fingerprint: 'b'.repeat(64) },
    { ...offer.score!, exceeds_roster_limit: true },
  ]) {
    expect(actionReason({ ...offer, score }, config, 5, 'accept')).toBeTruthy()
    expect(actionReason({ ...offer, score }, config, 5, 'decline')).toBeNull()
  }
  expect(
    actionReason(
      { ...offer, score: { ...offer.score!, complete_horizon: false } },
      config,
      5,
      'accept',
    ),
  ).toBeNull()
})
it('counter never guesses internal mappings or uses a different week', () => {
  expect(actionReason(offer, config, 5, 'counter')).toBeNull()
  expect(actionReason(offer, config, 6, 'counter')).toBeTruthy()
  expect(
    actionReason({ ...offer, score: { ...offer.score!, players: {} } }, config, 5, 'counter'),
  ).toBeTruthy()
  expect(
    actionReason(
      {
        ...offer,
        score: {
          ...offer.score!,
          players: {
            '111': { player_id: 'same', name: null },
            '222': { player_id: 'same', name: null },
          },
        },
      },
      config,
      5,
      'counter',
    ),
  ).toBeTruthy()
})
it.each([
  'unparsed',
  'responding',
  'accepted_pending_processing',
  'accepted',
  'declined',
  'countered',
  'vetoed',
  'expired',
  'withdrawn',
  'closed_unknown',
])('blocks actions for %s', (status) => {
  expect(actionReason({ ...offer, status }, config, 5, 'decline')).toBeTruthy()
})
it('blocks expiry margin, wrong scope, parse issues and competing publications', () => {
  expect(
    actionReason(
      {
        ...offer,
        expiration_date: new Date(Date.now() + 300000).toISOString(),
      },
      config,
      5,
      'decline',
    ),
  ).toBeTruthy()
  expect(actionReason({ ...offer, our_team_id: '8' }, config, 5, 'decline')).toBeTruthy()
  expect(actionReason({ ...offer, parse_issues: ['unknown'] }, config, 5, 'decline')).toBeTruthy()
  expect(
    actionReason(
      {
        ...offer,
        publications: [
          {
            kind: 'counter',
            status: 'pending',
            tracking_id: 't',
            approved_by: 'x',
            approved_at: '2026-10-07',
            fingerprint: offer.fingerprint!,
          },
        ],
      },
      config,
      5,
      'decline',
    ),
  ).toBeTruthy()
})
it('separates worker confirmation from queue acceptance and preserves unknown outcomes', () => {
  expect(outcomeCopy({ ...offer, decision: { outcome: 'unknown' } })).toContain(
    'manual verification',
  )
  expect(
    outcomeCopy({
      ...offer,
      decision: { outcome: 'blocked', closed_locks: ['not_armed'] },
    }),
  ).toContain('not_armed')
  expect(
    outcomeCopy({
      ...offer,
      status: 'accepted_pending_processing',
      decision: { outcome: 'accepted_pending_processing' },
    }),
  ).toContain('pending processing')
  expect(outcomeCopy({ ...offer, status: 'accepted' })).toContain('accepted')
  expect(outcomeCopy({ ...offer, decision: { outcome: 'rejected' } })).toContain('Retry it explicitly')
})
it('includes the original note in review identity even though worker fingerprint excludes it', () => {
  expect(reviewSignature({ ...offer, comment: 'Changed' })).not.toBe(reviewSignature(offer))
})
it('retry requires newly observed exact pre-publication failure evidence', () => {
  const failed = {
    kind: 'decision' as const,
    status: 'failed_before_publish' as const,
    action: 'accept' as const,
    decision_key: 'b'.repeat(64),
    tracking_id: 'new',
    approved_by: 'Manager',
    approved_at: '2026-10-07T12:00:00Z',
    fingerprint: offer.fingerprint!,
  }
  const attempt = {
    message: 'unknown',
    signature: reviewSignature(offer),
    action: 'accept' as const,
    comment: null,
    priorTrackingIds: ['old'],
    startedAt: '2026-10-07T11:00:00Z',
    approvedBy: 'Manager',
    decisionKey: 'b'.repeat(64),
  }
  expect(retryProven(attempt, { ...offer, publications: [failed] })).toBe(true)
  expect(
    retryProven({ ...attempt, priorTrackingIds: ['new'] }, { ...offer, publications: [failed] }),
  ).toBe(false)
  expect(
    retryProven(attempt, {
      ...offer,
      publications: [{ ...failed, status: 'pending' }],
    }),
  ).toBe(false)
})
it('does not guess away conflicting or unfamiliar worker outcomes', () => {
  expect(
    outcomeCopy({ ...offer, status: 'declined', decision: { outcome: 'accepted' } }),
  ).toContain('reconciliation')
  expect(outcomeCopy({ ...offer, decision: { outcome: 'future_result' } })).toContain(
    'reconciliation',
  )
})
it.each([
  [null, '2483df2843bca62e4f8ea3c428cd66c079d1ecc6f9fd62ee99b0a6ae19a1d31c'],
  [' Yes ☃ ', '05d5f1dddc837469c0fc931d4319d156d55122b189afa3e7ff29be6ee77dc338'],
  ['\ufeffYes\ufeff', 'cfcc90d94c07c87dc0028df5ec2a0106d01102e3cbf6292f7b2bf3a5241b6074'],
  [' emoji 🏈 \t', 'ad29bc8065372df2779afdf2486f1e00b37cde7f7a8b9a4acd6986f0d42243ba'],
])('matches worker decision-key fixture for %s', async (comment, expected) => {
  const { decisionKey } = await import('./inboxState')
  expect(
    await decisionKey({ ...offer, league_id: '456', our_team_id: '8' }, 'accept', comment),
  ).toBe(expected)
})

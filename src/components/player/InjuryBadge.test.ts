import { expect, it } from 'vitest'
import { injuryBadge } from './InjuryBadge'

it('keeps the plain status when the caller has no timeline', () => {
  expect(injuryBadge('OUT')).toMatchObject({ label: 'O', tooltip: 'OUT' })
  expect(injuryBadge('ACTIVE', 7)).toBeNull()
  expect(injuryBadge(null, 7)).toBeNull()
})

it('adds the expected return week for statuses scoring holds out', () => {
  expect(injuryBadge('INJURY_RESERVE', 14)).toMatchObject({
    label: 'IR · back wk 14', color: 'red', tooltip: 'INJURY RESERVE; ESPN expects him back in week 14',
  })
  expect(injuryBadge('OUT', null)).toMatchObject({ label: 'O · return unknown' })
})

it('never puts a return week on a game-time tag', () => {
  expect(injuryBadge('QUESTIONABLE', 12)).toMatchObject({ label: 'Q', tooltip: 'QUESTIONABLE' })
})

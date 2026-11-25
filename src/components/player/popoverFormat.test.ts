import { expect, it } from 'vitest'
import { breakdownTotal, formatPoints, formatQty, relativeTime, weeklyAverage } from './popoverFormat'

const NOW = Date.parse('2026-11-23T12:00:00Z')

it('reads elapsed time in the largest whole unit', () => {
  expect(relativeTime('2026-11-23T11:59:40Z', NOW)).toBe('just now')
  expect(relativeTime('2026-11-23T11:18:00Z', NOW)).toBe('42m')
  expect(relativeTime('2026-11-23T09:00:00Z', NOW)).toBe('3h')
  expect(relativeTime('2026-11-21T09:00:00Z', NOW)).toBe('2d')
  expect(relativeTime('2026-11-23T12:05:00Z', NOW)).toBe('just now')
})

it('formats points with a real minus and a dash for unknown', () => {
  expect(formatPoints(7.84)).toBe('7.8')
  expect(formatPoints(-2)).toBe('−2.0')
  expect(formatPoints(6, true)).toBe('+6.0')
  expect(formatPoints(null)).toBe('—')
})

it('sums breakdown lines including negative ones', () => {
  const line = (points: number) => ({ stat_key: 'k', label: 'L', qty: 1, unit: 'TD', rule_label: 'r', points })
  expect(breakdownTotal([line(7.8), line(6), line(-2)])).toBeCloseTo(11.8)
})

it('shows a quantity with its unit, and a dash for the unitemized other line', () => {
  const line = { stat_key: 'rushYd', label: 'Rushing yards', qty: 98, unit: 'yds', rule_label: 'r', points: 9.8 }
  expect(formatQty(line)).toBe('98 yds')
  expect(formatQty({ ...line, unit: null, qty: 1 })).toBe('1')
  expect(formatQty({ ...line, stat_key: 'other', qty: null, unit: null, rule_label: 'Not itemized' })).toBe('—')
})

it('averages only scored weeks', () => {
  expect(weeklyAverage([{ week: 8, points: 10 }, { week: 9, points: null }, { week: 10, points: 20 }])).toBe(15)
  expect(weeklyAverage([{ week: 8, points: null }])).toBeNull()
})

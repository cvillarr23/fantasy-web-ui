import { expect, it } from 'vitest'
import { formatNumber } from './formatNumber'

it.each([
  [12.345, {}, '12.3'],
  [null, {}, '—'],
  [undefined, { unknown: 'Unknown' }, 'Unknown'],
  [Number.NaN, {}, '—'],
  [1.18, { digits: 2 }, '1.18'],
  [3.5, { signed: true }, '+3.5'],
  [-4.4, { signed: true }, '-4.4'],
  [0, { signed: true }, '0.0'],
  [0, { signed: true, signZero: true }, '+0.0'],
] as const)('formats %s with %o as %s', (value, options, expected) => {
  expect(formatNumber(value, options)).toBe(expected)
})

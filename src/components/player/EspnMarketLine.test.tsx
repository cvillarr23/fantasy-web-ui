import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { EspnOwnership } from '../../api/types'
import { EspnMarketLine } from './EspnMarketLine'

afterEach(cleanup)

const espn = (over: Partial<EspnOwnership> = {}): EspnOwnership => ({
  pos_rank: 12,
  percent_owned: 92,
  percent_started: 78,
  percent_bench: 14,
  percent_change: 3,
  ...over,
})

it('shows rank, start, bench and a green rise with the league-wide tooltip', () => {
  const { container } = render(<EspnMarketLine position="WR" espn={espn()} />)
  expect(screen.getByText('WR12')).toBeTruthy()
  expect(screen.getByText('78%')).toBeTruthy()
  expect(screen.getByText('14% bench')).toBeTruthy()
  expect(screen.getByText('▲3').className).toContain('espn-change-up')
  expect(screen.getByText('ESPN').getAttribute('title')).toBe(
    'ESPN, all leagues: 92% rostered, 78% started, 14% benched',
  )
  expect(container.querySelector('.espn-cold')).toBeNull()
})

it('marks a drop in orange and a start% under 25 as cold', () => {
  const { container } = render(<EspnMarketLine position="RB" espn={espn({ pos_rank: 41, percent_started: 6, percent_change: -4 })} />)
  expect(screen.getByText('▼4').className).toContain('espn-change-down')
  expect(container.querySelector('.espn-cold')).not.toBeNull()
})

it.each([
  ['undefined', undefined],
  ['null', null],
  ['all-null', { pos_rank: null, percent_owned: null, percent_started: null, percent_bench: null, percent_change: null }],
])('renders nothing for %s data', (_label, value) => {
  const { container } = render(<EspnMarketLine position="WR" espn={value} />)
  expect(container.firstChild).toBeNull()
})

it('skips fields that are null and hides a flat change', () => {
  render(<EspnMarketLine position="TE" espn={espn({ percent_bench: null, percent_change: 0 })} />)
  expect(screen.queryByText(/bench/)).toBeNull()
  expect(screen.queryByText(/[▲▼]/)).toBeNull()
  expect(screen.getByText('TE12')).toBeTruthy()
})

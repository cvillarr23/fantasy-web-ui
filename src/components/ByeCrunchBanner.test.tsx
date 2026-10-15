import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { ByeCrunchSummary } from './ByeCrunchBanner'
import type { TeamByeOutlook } from '../api/types'

afterEach(cleanup)

const outlook = (weeks: TeamByeOutlook['weeks']): TeamByeOutlook => ({
  team_id: '4', team_name: 'Us', season: 2026, start_week: 7, end_week: 10, schedule_known: true,
  median_lineup_value: 30, crunch_weeks: weeks.filter((w) => w.crunch).map((w) => w.week), weeks,
  players: [
    { espn_id: '1', name: 'Back One', position: 'RB', nfl_team: 'BUF', nfl_bye_week: 8 },
    { espn_id: '2', name: 'Back Two', position: 'RB', nfl_team: 'BUF', nfl_bye_week: 8 },
  ],
})
const week = (n: number, overrides: Partial<TeamByeOutlook['weeks'][number]> = {}) => ({
  week: n, value: 30, shortfall: 0, unfilled_slots: [], held_slots: [], on_bye: [], unknown: [],
  replacement_level_starters: 0, crunch: false, ...overrides,
})
const view = (o: TeamByeOutlook) =>
  render(<MantineProvider><MemoryRouter><ByeCrunchSummary outlook={o} /></MemoryRouter></MantineProvider>)

it('names the crunch week, who is on bye and why, with links to fix it', () => {
  view(outlook([week(7), week(8, { on_bye: ['1', '2'], unfilled_slots: ['RB'], crunch: true })]))
  expect(screen.getByText('Bye-week crunch ahead')).toBeTruthy()
  expect(screen.getByText(/Back One, Back Two on bye leaves RB slot empty/)).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Find a fill-in' }).getAttribute('href')).toBe('/waivers?week=7')
  expect(screen.getByRole('link', { name: 'Look for a trade' }).getAttribute('href')).toBe('/trades')
})

it('explains a crunch without an empty seat as a forced below-replacement starter', () => {
  view(outlook([week(9, { on_bye: ['1'], replacement_level_starters: 1, crunch: true })]))
  expect(screen.getByText(/Back One on bye forces a below-replacement starter/)).toBeTruthy()
})

it('renders nothing when byes are covered', () => {
  const { container } = view(outlook([week(8, { on_bye: ['1'] })]))
  expect(container.querySelector('.mantine-Alert-root')).toBeNull()
})

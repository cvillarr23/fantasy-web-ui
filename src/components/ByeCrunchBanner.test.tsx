import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { ByeCrunchSummary, type ByeFixes } from './ByeCrunchBanner'
import { byeFillIns, byeTradeFixes } from './byeFixes'
import { lineupTradeCandidates, lineupWaivers } from './lineupFixtures'
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
  expect(screen.getByRole('link', { name: 'See all fill-ins' }).getAttribute('href')).toBe('/waivers?week=7')
  expect(screen.getByRole('link', { name: 'See all trades' }).getAttribute('href')).toBe('/trades?week=7#finder')
})

it('explains a crunch without an empty seat as a forced below-replacement starter', () => {
  view(outlook([week(9, { on_bye: ['1'], replacement_level_starters: 1, crunch: true })]))
  expect(screen.getByText(/Back One on bye forces a below-replacement starter/)).toBeTruthy()
})

it('renders nothing when byes are covered', () => {
  const { container } = view(outlook([week(8, { on_bye: ['1'] })]))
  expect(container.querySelector('.mantine-Alert-root')).toBeNull()
})

const crunchOutlook = () => outlook([week(8, { on_bye: ['1', '2'], unfilled_slots: ['RB'], crunch: true })])

it('shows the best waiver fill-ins and trades inline, each linking to its full page', () => {
  const fixes: ByeFixes = {
    waivers: byeFillIns(lineupWaivers.recommendations, [9]),
    trades: byeTradeFixes(lineupTradeCandidates, [9]),
  }
  render(<MantineProvider><MemoryRouter><ByeCrunchSummary outlook={crunchOutlook()} fixes={fixes} /></MemoryRouter></MantineProvider>)
  expect(screen.getByRole('link', { name: /Sample Waiver Back/ }).getAttribute('href')).toBe('/waivers?week=7')
  expect(screen.getByText('+4.8 VORP')).toBeTruthy()
  expect(screen.getByRole('link', { name: /Gridiron Ghosts/ }).getAttribute('href')).toBe('/trades?week=7#finder')
  expect(screen.getByText('✓ Proposable')).toBeTruthy()
  expect(screen.getByText('Needs a drop')).toBeTruthy()
  expect(screen.queryByText(/No Help Team/)).toBeNull()
})

it('hides only the panel whose read failed, and says when a list is empty or loading', () => {
  render(<MantineProvider><MemoryRouter>
    <ByeCrunchSummary outlook={crunchOutlook()} fixes={{ waivers: null, trades: [] }} />
  </MemoryRouter></MantineProvider>)
  expect(screen.queryByText('Waiver fill-ins')).toBeNull()
  expect(screen.getByText('No proposable trades fix these weeks.')).toBeTruthy()
  cleanup()
  render(<MantineProvider><MemoryRouter>
    <ByeCrunchSummary outlook={crunchOutlook()} fixes={{ waivers: undefined, trades: null }} />
  </MemoryRouter></MantineProvider>)
  expect(screen.getByText('Loading fill-ins…')).toBeTruthy()
  expect(screen.queryByText('Trade targets')).toBeNull()
})

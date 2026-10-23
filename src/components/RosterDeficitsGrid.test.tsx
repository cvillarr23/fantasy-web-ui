import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { RosterDeficitsGrid } from './RosterDeficitsGrid'
import { lineupDeficits } from './lineupFixtures'

vi.mock('../hooks/useTeamNames', () => ({ useTeamNames: () => ({ '8': 'Gridiron Ghosts', '9': 'Fourth and Long' }) }))
afterEach(cleanup)

const view = (deficits = lineupDeficits) => render(
  <MantineProvider><MemoryRouter><RosterDeficitsGrid deficits={deficits} myTeamId="7" /></MemoryRouter></MantineProvider>,
)

it('leads with your own positions and names the ones you are short at', () => {
  view()
  expect(screen.getByText('Covered, 1 spare')).toBeTruthy()
  expect(screen.getByText('Short 1')).toBeTruthy()
  expect(screen.getByText(/can't fill every starting slot at TE/)).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Find a free agent' }).getAttribute('href')).toBe('/waivers?week=9#free-agents')
  expect(screen.getByRole('link', { name: 'Look for a trade' }).getAttribute('href')).toBe('/trades?week=9#finder')
})

it('lists the league with your team first and a Short at column', () => {
  view()
  const rows = screen.getAllByRole('row').slice(1)
  expect(within(rows[0]).getByRole('rowheader').textContent).toBe('Your team')
  expect(within(rows[0]).getByText('TE', { selector: 'td' })).toBeTruthy()
  expect(within(rows[2]).getByRole('rowheader').textContent).toBe('Fourth and Long')
  expect(within(rows[2]).getByText('WR', { selector: 'td' })).toBeTruthy()
  expect(within(rows[1]).getByText('None')).toBeTruthy()
  expect(screen.getAllByText('short')).toHaveLength(2)
})

it('hides the shortfall actions when every position is covered', () => {
  const covered = { ...lineupDeficits, teams: { ...lineupDeficits.teams, '7': { ...lineupDeficits.teams['7'], TE: { rostered: 2, starters_required: 2, deficit: 0, net_vorp: 1 } } } }
  view(covered)
  expect(screen.queryByRole('link', { name: 'Look for a trade' })).toBeNull()
  expect(screen.getByText('Covered')).toBeTruthy()
})

import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import type { LiveBlock } from '../../api/types'
import { LiveBadge } from './LiveBadge'
import { LiveGameLine } from './LiveGameLine'
import { PlayerCard } from './PlayerCard'

afterEach(cleanup)

const live: LiveBlock = {
  status: 'in_progress', period: 3, clock: '8:42', home_abbr: 'ATL', home_score: 17, away_abbr: 'TB', away_score: 14,
  possession: 'ATL', yard_line: 'TB 12', red_zone: true, stat_line: { rushYd: 78, rushTD: 1 }, live_points: 12, updated_at: null,
}
const wrap = (node: React.ReactNode) => render(<MantineProvider>{node}</MantineProvider>)

it('shows the live line with the red zone marked and the stat line underneath', () => {
  wrap(<LiveGameLine live={live} team="ATL" />)
  expect(screen.getByText('Q3 8:42')).toBeTruthy()
  expect(screen.getByText('TB 14–17 ATL')).toBeTruthy()
  expect(screen.getByText('ATL ball · TB 12').className).toContain('live-game-redzone')
  expect(screen.getByText('78 rush yds 1 TD')).toBeTruthy()
})

it('shows opponent without a kickoff before the game, and the result after it', () => {
  const { rerender } = wrap(<LiveGameLine live={{ ...live, status: 'not_started', stat_line: null }} team="ATL" />)
  expect(screen.getByText('vs TB')).toBeTruthy()
  rerender(<MantineProvider><LiveGameLine live={{ ...live, status: 'final' }} team="ATL" /></MantineProvider>)
  expect(screen.getByText('W 17–14 vs TB')).toBeTruthy()
})

it('renders nothing for a missing or status-less block', () => {
  const { container } = wrap(<><LiveGameLine live={null} /><LiveGameLine live={{ ...live, status: null }} /></>)
  expect(container.querySelector('.live-game-line')).toBeNull()
})

it('badges live and final games but not upcoming ones', () => {
  const { rerender } = wrap(<LiveBadge live={live} />)
  expect(screen.getByText('Live')).toBeTruthy()
  rerender(<MantineProvider><LiveBadge live={{ ...live, status: 'final' }} /></MantineProvider>)
  expect(screen.getByText('Final')).toBeTruthy()
  rerender(<MantineProvider><LiveBadge live={{ ...live, status: 'not_started' }} /></MantineProvider>)
  expect(screen.queryByText('Live')).toBeNull()
  expect(screen.queryByText('Final')).toBeNull()
})

it('marks a live player card and its avatar, and only then', () => {
  const player = { id: '1', name: 'Sample Back', headshotUrl: 'x.png', live }
  const { container, rerender } = wrap(<PlayerCard variant="card" player={player} />)
  expect(container.querySelector('.player-card.is-live')).toBeTruthy()
  expect(container.querySelector('.player-avatar-dot')).toBeTruthy()
  rerender(<MantineProvider><PlayerCard variant="card" player={{ ...player, live: { ...live, status: 'final' } }} /></MantineProvider>)
  expect(container.querySelector('.is-live')).toBeNull()
  expect(container.querySelector('.player-avatar-dot')).toBeNull()
})

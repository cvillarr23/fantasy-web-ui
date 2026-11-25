import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { afterEach, expect, it, vi } from 'vitest'
import { MatchupFeed } from './MatchupFeed'
import { GamesPanel } from './GamesPanel'
import { liveFeedFixture, liveMatchupFixture } from './liveFixtures'
import { matchupGames } from './matchupLive'

afterEach(cleanup)

const items = liveFeedFixture('sunday').items

function renderFeed(list = items, onOpenPlayer = vi.fn()) {
  const view = render(<MantineProvider><MatchupFeed items={list} onOpenPlayer={onOpenPlayer} /></MantineProvider>)
  return { ...view, onOpenPlayer }
}

it('colors each row\'s stripe by side and news', () => {
  renderFeed()
  const rows = screen.getAllByRole('listitem')
  expect(rows[0].querySelector('.feed-stripe-mine')).toBeTruthy()
  expect(rows[1].querySelector('.feed-stripe-theirs')).toBeTruthy()
  expect(rows[2].querySelector('.feed-stripe-news')).toBeTruthy()
})

it('shows positive deltas green, negative in the error color, and a dash for an unknown one', () => {
  renderFeed()
  expect(screen.getByText('+1.2').className).toContain('feed-delta-positive')
  expect(screen.getByText('-2.0').className).toContain('feed-delta-negative')
  expect(screen.getByText('—').className).not.toContain('feed-delta-positive')
})

it('filters when a pill is pressed and marks the pressed one', () => {
  renderFeed()
  const pill = screen.getByRole('button', { name: 'Touchdowns' })
  fireEvent.click(pill)
  expect(pill.getAttribute('aria-pressed')).toBe('true')
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', { name: 'News' }))
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
  expect(screen.getByRole('button', { name: 'All' }).getAttribute('aria-pressed')).toBe('false')
})

it('says so when a filter matches nothing', () => {
  renderFeed(items.filter((item) => item.type === 'play'))
  fireEvent.click(screen.getByRole('button', { name: 'News' }))
  expect(screen.getByText('Nothing matches this filter yet.')).toBeTruthy()
})

it('opens the player when a name is clicked', () => {
  const { onOpenPlayer } = renderFeed()
  fireEvent.click(screen.getAllByRole('button', { name: 'Sample Runner A' })[0])
  expect(onOpenPlayer).toHaveBeenCalledWith('p1')
})

it('highlights only the rows that arrived since the previous poll', () => {
  const { rerender, onOpenPlayer } = renderFeed(items.slice(1))
  expect(document.querySelectorAll('.feed-row-new')).toHaveLength(0)
  rerender(<MantineProvider><MatchupFeed items={items} onOpenPlayer={onOpenPlayer} /></MantineProvider>)
  const fresh = document.querySelectorAll('.feed-row-new')
  expect(fresh).toHaveLength(1)
  expect(within(fresh[0] as HTMLElement).getByText('12-yd run to TB 12')).toBeTruthy()
})

it('lists each game with both sides\' points, and no points before kickoff', () => {
  const games = matchupGames(liveMatchupFixture('sunday'))
  render(<GamesPanel games={games} updatedAt={Date.now() - 12_000} />)
  const tiles = screen.getAllByRole('listitem')
  expect(tiles).toHaveLength(3)
  expect(within(tiles[0]).getByText(/^You 35\.8 pts$/)).toBeTruthy()
  expect(within(tiles[2]).queryByText(/pts/)).toBeNull()
  expect(screen.getByText(/^Updated \d+s ago$/)).toBeTruthy()
  expect(screen.queryByRole('button')).toBeNull()
})

it('shows the scoring guide link only when there is somewhere to go', () => {
  const { rerender } = render(<GamesPanel games={[]} updatedAt={null} />)
  expect(screen.queryByText(/How fantasy scoring works/)).toBeNull()
  rerender(<GamesPanel games={[]} updatedAt={null} onOpenScoringGuide={() => {}} />)
  expect(screen.getByText(/How fantasy scoring works/)).toBeTruthy()
})

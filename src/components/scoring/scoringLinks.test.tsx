import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { Route, Routes, useLocation } from 'react-router-dom'
import type { ReactElement } from 'react'
import { getCurrentWeek, getMatchup, getMatchupFeed, getPlayerSummary } from '../../api/client'
import { queryClient } from '../../api/queryClient'
import type { DraftPickSummary } from '../../api/types'
import { DraftConfigContext } from '../../hooks/useDraftConfig'
import { playerSummaryLive } from '../../stories/fixtures'
import { renderForTest } from '../jobs/renderForTest'
import { matchupConfig } from '../matchup/fixtures'
import { MatchupPage } from '../MatchupPage'
import { PickFeed } from '../PickFeed'
import { scoredMatchupFixture } from './fixtures'

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  getMatchup: vi.fn(),
  getMatchupFeed: vi.fn(),
  getCurrentWeek: vi.fn(),
  getPlayerSummary: vi.fn(),
  getTeamNames: vi.fn(() => Promise.resolve({})),
}))

beforeEach(() => {
  queryClient.clear()
  vi.mocked(getMatchup).mockResolvedValue(scoredMatchupFixture())
  vi.mocked(getMatchupFeed).mockResolvedValue({ items: [], next_before: null })
  vi.mocked(getCurrentWeek).mockResolvedValue({ week: 7 })
  vi.mocked(getPlayerSummary).mockResolvedValue(playerSummaryLive)
})
afterEach(cleanup)

function Destination() {
  const { pathname, search } = useLocation()
  return <p data-testid="destination">{pathname + search}</p>
}

function openAt(route: string, path: string, page: ReactElement) {
  return renderForTest(
    <DraftConfigContext.Provider value={{ config: matchupConfig, loading: false, saveConfig: vi.fn(), setConfig: vi.fn() }}>
      <Routes>
        <Route path={path} element={page} />
        <Route path="/scoring" element={<Destination />} />
      </Routes>
    </DraftConfigContext.Provider>,
    route,
  )
}

async function followPopoverLink() {
  fireEvent.click(await screen.findByRole('tab', { name: 'Stats' }))
  fireEvent.click(await screen.findByRole('button', { name: 'How is this scored?' }))
}

describe('links to the scoring guide', () => {
  it('opens it from the Matchup games panel, keeping the chosen week', async () => {
    openAt('/matchup?week=5', '/matchup', <MatchupPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'How fantasy scoring works →' }))
    expect(screen.getByTestId('destination').textContent).toBe('/scoring?week=5')
  })

  it('opens it from a player popover on the draft pick feed', async () => {
    const pick = { pick_number: 1, team_id: '7', player_id: 'p9002', name: 'Sample Runner' } as DraftPickSummary
    openAt('/draft', '/draft', <PickFeed picks={[pick]} myTeamId="7" status={null} />)
    fireEvent.click(screen.getAllByRole('button', { name: /Show player summary/ })[0])
    await followPopoverLink()
    expect(screen.getByTestId('destination').textContent).toBe('/scoring')
  })
})

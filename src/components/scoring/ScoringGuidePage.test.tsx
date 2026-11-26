import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { ApiError, getCurrentWeek, getMatchup, getScoringRules } from '../../api/client'
import { queryClient } from '../../api/queryClient'
import { DraftConfigContext } from '../../hooks/useDraftConfig'
import type { DraftConfig } from '../../api/types'
import { renderForTest } from '../jobs/renderForTest'
import { matchupConfig, matchupFixture } from '../matchup/fixtures'
import { scoredMatchupFixture, scoringRules } from './fixtures'
import { ScoringGuidePage } from './ScoringGuidePage'

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  getScoringRules: vi.fn(),
  getMatchup: vi.fn(),
  getCurrentWeek: vi.fn(),
}))

const appDefaults = queryClient.getDefaultOptions()

beforeEach(() => {
  queryClient.clear()
  queryClient.setDefaultOptions({ ...appDefaults, queries: { ...appDefaults.queries, retry: false } })
  vi.mocked(getScoringRules).mockResolvedValue(scoringRules)
  vi.mocked(getMatchup).mockResolvedValue(scoredMatchupFixture())
  vi.mocked(getCurrentWeek).mockResolvedValue({ week: 7 } as Awaited<ReturnType<typeof getCurrentWeek>>)
})
afterEach(() => {
  cleanup()
  queryClient.setDefaultOptions(appDefaults)
  vi.clearAllMocks()
})

function open(route = '/scoring', config: DraftConfig = matchupConfig) {
  return renderForTest(
    <DraftConfigContext.Provider value={{ config, loading: false, saveConfig: vi.fn(), setConfig: vi.fn() }}>
      <ScoringGuidePage />
    </DraftConfigContext.Provider>,
    route,
  )
}
const breakdown = () => screen.findByRole('table', { name: "This week's scoring breakdown" })
const picker = () => screen.getByRole('combobox', { name: 'Player' }) as HTMLSelectElement

describe('ScoringGuidePage', () => {
  it('explains that only starters count and lists the rules for the configured season', async () => {
    open()
    expect(screen.getByRole('heading', { level: 1, name: 'How fantasy points are scored' })).toBeTruthy()
    expect(screen.getByTestId('scoring-intro').textContent).toContain('sum of your starters only')
    expect(await screen.findByRole('table', { name: "Your league's scoring rules" })).toBeTruthy()
    expect(getScoringRules).toHaveBeenCalledWith(2026)
  })

  it('starts the example on your highest scorer and explains it with their numbers', async () => {
    open()
    expect(within(await breakdown()).getByText('78 yds')).toBeTruthy()
    expect(picker().value).toBe('a2')
    expect(await screen.findByText('Rushing yards: 78 yds × 0.1 = 7.8')).toBeTruthy()
    expect(screen.getByText(/That's the player's fantasy score: 16\.8\./)).toBeTruthy()
  })

  it('changes the example when another player is picked', async () => {
    open()
    await breakdown()
    fireEvent.change(picker(), { target: { value: 'c1' } })
    expect(within(await breakdown()).getByText('300 yds')).toBeTruthy()
    expect(screen.queryByText('78 yds')).toBeNull()
    expect(screen.getByText('Passing yards: 300 yds × 0.04 = 12')).toBeTruthy()
  })

  it('offers both teams, grouped', async () => {
    open()
    await breakdown()
    const groups = [...picker().querySelectorAll('optgroup')].map((group) => group.label)
    expect(groups).toEqual(['Your team', 'Opponent'])
  })

  it('reads the week from the URL and keeps it on the way back', async () => {
    open('/scoring?week=5')
    await breakdown()
    expect(getMatchup).toHaveBeenCalledWith(2026, 5)
    expect(screen.getByRole('link', { name: '← Matchup' }).getAttribute('href')).toBe('/matchup?week=5')
  })

  it('follows the current week without pinning it in the back link', async () => {
    open()
    await breakdown()
    expect(getMatchup).toHaveBeenCalledWith(2026, 7)
    expect(screen.getByRole('link', { name: '← Matchup' }).getAttribute('href')).toBe('/matchup')
  })

  it('keeps the four steps when nobody has scored yet', async () => {
    vi.mocked(getMatchup).mockResolvedValue(matchupFixture())
    open()
    expect(await screen.findByText(/No player in this matchup has scored/)).toBeTruthy()
    expect(within(screen.getByRole('list', { name: 'How a score adds up' })).getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText("Multiply it by the league's rule for that stat.")).toBeTruthy()
  })

  it('stops loading the example when there is no current week', async () => {
    vi.mocked(getCurrentWeek).mockResolvedValue({ week: 0 })
    open()
    await screen.findByRole('table', { name: "Your league's scoring rules" })
    await waitFor(() => expect(getCurrentWeek).toHaveBeenCalled())
    expect(screen.queryByRole('status', { name: 'Loading example' })).toBeNull()
    expect(screen.getByRole('list', { name: 'How a score adds up' })).toBeTruthy()
  })

  it('says so on a bye week', async () => {
    vi.mocked(getMatchup).mockRejectedValue(new ApiError(404, 'No matchup'))
    open()
    expect(await screen.findByText(/No matchup this week/)).toBeTruthy()
  })

  it('asks for league settings instead of an example when none are set', async () => {
    open('/scoring', { ...matchupConfig, league_id: '', team_id: '' })
    expect(await screen.findByRole('link', { name: 'Set your league and team' })).toBeTruthy()
    expect(getMatchup).not.toHaveBeenCalled()
    expect(await screen.findByRole('table', { name: "Your league's scoring rules" })).toBeTruthy()
  })

  it('says when no rules are synced for the season', async () => {
    vi.mocked(getScoringRules).mockRejectedValue(new ApiError(404, 'No league settings synced'))
    open()
    expect(await screen.findByText('No scoring settings synced for the 2026 season.')).toBeTruthy()
  })

  it('offers a retry when the rules fail to load', async () => {
    vi.mocked(getScoringRules).mockRejectedValueOnce(new ApiError(500, 'boom'))
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('table', { name: "Your league's scoring rules" })).toBeTruthy()
  })
})

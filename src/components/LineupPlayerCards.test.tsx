import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { getCurrentWeek, getLineupRoster, getLivePlayers, getPlayerSummary, getRecentNews } from '../api/client'
import type { LineupPlayerLine, LiveBlock } from '../api/types'
import { queryClient } from '../api/queryClient'
import { CONFIG_STORAGE_KEY } from '../hooks/useDraftConfig'
import { playerSummaryLive } from '../stories/fixtures'
import { renderForTest } from './jobs/renderForTest'
import { LineupEditor } from './LineupEditor'
import { lineupConfig, lineupPlayer } from './lineupFixtures'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  getLineupRoster: vi.fn(), getCurrentWeek: vi.fn(), getLivePlayers: vi.fn(),
  getPlayerSummary: vi.fn(), getRecentNews: vi.fn(),
}))

const block = (over: Partial<LiveBlock>): LiveBlock => ({
  status: 'in_progress', period: 3, clock: '8:42', home_abbr: 'KC', home_score: 17, away_abbr: 'LV', away_score: 14,
  possession: null, yard_line: null, red_zone: null, stat_line: null, live_points: 14.2, updated_at: null, ...over,
})
// ESPN's id is the line's player_id; core's own id is what the per-player reads take.
const line = (espnId: string, name: string, slot: string, over: Partial<LineupPlayerLine> = {}) =>
  lineupPlayer(espnId, name, 'RB', slot, { core_player_id: `core-${espnId}`, projected_points: 22.4, ...over })

const roster = {
  starters: [line('1', 'Live Back', 'RB'), line('2', 'Waiting Back', 'RB', { projected_points: 9.5 })],
  bench: [
    line('3', 'Done Back', 'BE', { projected_points: null }),
    line('4', 'Unmatched Back', 'BE', { core_player_id: null }),
  ],
}

beforeEach(() => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(lineupConfig))
  vi.mocked(getCurrentWeek).mockResolvedValue({ week: 9 })
  vi.mocked(getLineupRoster).mockResolvedValue(roster)
  vi.mocked(getLivePlayers).mockResolvedValue({
    players: {
      'core-1': block({}),
      'core-2': block({ status: 'not_started', live_points: 0 }),
      'core-3': block({ status: 'final', live_points: 0 }),
    },
  })
  vi.mocked(getRecentNews).mockResolvedValue({ has_news_24h: { 'core-1': true, 'core-2': false } })
  vi.mocked(getPlayerSummary).mockResolvedValue(playerSummaryLive)
})
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); queryClient.clear() })

const start = () => renderForTest(<LineupEditor config={lineupConfig} week={9} />, '/lineup?week=9')
const card = async (name: string) =>
  within((await screen.findByText(name)).closest('.player-card') as HTMLElement)
const points = (element: Element) => element.querySelector('strong')?.textContent

async function scores(name: string) {
  const element = (await screen.findByText(name)).closest('.player-card') as HTMLElement
  return [points(element.querySelector('.score-value.actual')!), points(element.querySelector('.score-value.projected')!)]
}

it('asks for live data and news with core ids, never ESPN ids', async () => {
  start()
  await waitFor(() => expect(getLivePlayers).toHaveBeenCalledWith(['core-1', 'core-2', 'core-3']))
  expect(getRecentNews).toHaveBeenCalledWith(['core-1', 'core-2', 'core-3'])
  expect(await (await card('Live Back')).findByText('Q3 8:42')).toBeTruthy()
})

it('shows actual points once a game has started, with a dash for anything unknown', async () => {
  start()
  await waitFor(async () => expect(await scores('Live Back')).toEqual(['14.2', '22.4']))
  expect(await scores('Waiting Back')).toEqual(['—', '9.5'])
  expect(await scores('Done Back')).toEqual(['0.0', '—'])
  expect(await scores('Unmatched Back')).toEqual(['—', '22.4'])
})

const details = async (name: string) => {
  const element = (await screen.findByText(name)).closest('.player-card') as HTMLElement
  return element.querySelector('.player-card-meta')!
}
// Collapses the non-breaking space so the assertions read as the card does.
const text = (element: Element) => element.textContent!.replace(/\s+/g, ' ').trim()

it('puts VORP under a game line without a separator', async () => {
  start()
  await (await card('Live Back')).findByText('Q3 8:42')
  const stats = (await details('Live Back')).querySelector('.player-card-stats')!
  expect(text(stats)).toBe('VORP 5.2 ?')
})

it('joins position, team and VORP on one line when there is no game', async () => {
  start()
  expect(text(await details('Unmatched Back'))).toBe('RB · KC · VORP 5.2 ?')
})

it('keeps the separator on the same line as the item before it', async () => {
  start()
  expect((await details('Unmatched Back')).textContent).toContain('KC · VORP')
})

it('falls back to position and team when the live block has no game', async () => {
  vi.mocked(getLivePlayers).mockResolvedValue({
    players: { 'core-1': block({}), 'core-2': block({ status: null }) },
  })
  start()
  await (await card('Live Back')).findByText('Q3 8:42')
  expect(text(await details('Waiting Back'))).toBe('RB · KC · VORP 5.2 ?')
})

it('shows no leading separator when position and team are unknown', async () => {
  vi.mocked(getLineupRoster).mockResolvedValue({
    starters: [line('5', 'Bare Back', 'RB', { position: '', pro_team: undefined })], bench: [],
  })
  start()
  expect(text(await details('Bare Back'))).toBe('VORP 5.2 ?')
})

it('badges only the players with news in the last day', async () => {
  start()
  expect(await (await card('Live Back')).findByText('News')).toBeTruthy()
  expect((await card('Waiting Back')).queryByText('News')).toBeNull()
})

it('shows no badge and no error when the news read fails', async () => {
  vi.mocked(getRecentNews).mockRejectedValue(new Error('news down'))
  start()
  await (await card('Live Back')).findByText('Q3 8:42')
  expect(screen.queryByText('News')).toBeNull()
  expect(screen.queryByText(/news down/)).toBeNull()
})

it('opens the popover for the core id from the name button', async () => {
  start()
  fireEvent.click(await screen.findByRole('button', { name: 'Live Back' }))
  expect(await screen.findByRole('tab', { name: 'News' })).toBeTruthy()
  expect(getPlayerSummary).toHaveBeenCalledWith('core-1')
})

it('leaves a player core cannot identify as plain text', async () => {
  start()
  await screen.findByText('Unmatched Back')
  expect(screen.queryByRole('button', { name: 'Unmatched Back' })).toBeNull()
})

it('opens nothing from the rest of the card, and the name never starts a drag', async () => {
  start()
  const name = await screen.findByRole('button', { name: 'Live Back' })
  const handle = name.closest('.player-card') as HTMLElement
  const press = (target: Element) => fireEvent.pointerDown(target, { button: 0, isPrimary: true })

  press(name)
  fireEvent.keyDown(name, { key: 'Enter', code: 'Enter' })
  expect(handle.getAttribute('aria-pressed')).not.toBe('true')

  press(handle)
  await waitFor(() => expect(handle.getAttribute('aria-pressed')).toBe('true'))
  fireEvent.pointerUp(document, { button: 0, isPrimary: true })
  fireEvent.click(handle)
  expect(screen.queryByRole('dialog')).toBeNull()
})

import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { LineupPage } from './LineupPage'
import { ApiError, ApiTimeoutError, getCurrentWeek, getLineupRoster, triggerLineupSwap } from '../api/client'
import { queryClient } from '../api/queryClient'
import { CONFIG_STORAGE_KEY } from '../hooks/useDraftConfig'
import type { LineupPlayerLine, LineupRosterResponse } from '../api/types'

vi.mock('../api/client', async (importOriginal) => ({
  // The real error classes, so the editor can tell a rejection from an unanswered request.
  ...(await importOriginal<typeof import('../api/client')>()),
  getLineupRoster: vi.fn(), triggerLineupSwap: vi.fn(), getCurrentWeek: vi.fn(),
  getRosterDeficits: vi.fn().mockResolvedValue({ teams: {} }),
  getMatchup: vi.fn().mockRejectedValue(new Error('No matchup')),
}))
vi.mock('./RosterDeficitsGrid', () => ({ RosterDeficitsGrid: () => <div>Roster deficits</div> }))
Object.defineProperty(window, 'matchMedia', {
  writable: true, value: vi.fn(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })),
})

const player = (id: string, slot: string, overrides: Partial<LineupPlayerLine> = {}): LineupPlayerLine => ({
  player_id: id, espn_id: `espn-${id}`, name: id, position: 'RB', slot, pro_team: 'KC',
  jersey: null, injury_status: null, headshot_url: '', deficit_flag: false,
  suggested_swap: null, net_vorp: 5, rumor_sentiment: null, rumor_confidence: null, rumor_suggested_action: null,
  ...overrides,
})
const hurt = player('Hurt', 'RB', { injury_status: 'OUT', ir_suggestion: { action: 'move_to_ir', reason: 'Out for weeks.' } })
const healed = player('Healed', 'IR', { ir_suggestion: { action: 'activate_from_ir', reason: 'Active again.' } })
const roster: LineupRosterResponse = { starters: [hurt], bench: [healed, player('Backup', 'BE')] }

beforeEach(() => {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ league_id: '123', team_id: '8', season: 2026, mode: 'live' }))
  vi.mocked(getCurrentWeek).mockResolvedValue({ week: 5 })
  vi.mocked(getLineupRoster).mockResolvedValue(roster)
  vi.mocked(triggerLineupSwap).mockResolvedValue({ status: 'accepted', tracking_id: 'lineup-123' })
})
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); queryClient.clear() })

function start(url = '/lineup?week=5') {
  return render(<MantineProvider><MemoryRouter initialEntries={[url]}><Routes>
    <Route path="/lineup" element={<LineupPage />} />
  </Routes></MemoryRouter></MantineProvider>)
}
async function enabledButton(name: string) {
  const button = await screen.findByRole('button', { name }) as HTMLButtonElement
  await waitFor(() => expect(button.disabled).toBe(false))
  return button
}

it('confirms a live move to IR and sends one IR entry by ESPN id', async () => {
  start()
  fireEvent.click(await enabledButton('Move Hurt to IR'))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText(/real change to your ESPN roster, not a dry run/)).toBeTruthy()
  expect(within(dialog).getByText('Out for weeks.')).toBeTruthy()
  expect(within(dialog).getByText('This leaves the RB slot empty until you start someone there.')).toBeTruthy()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm IR move' }))
  await waitFor(() => expect(triggerLineupSwap).toHaveBeenCalledWith(
    '8', [{ kind: 'ir', player_id: 'espn-Hurt', player_name: 'Hurt', slot: 'IR' }], 'lineup-ir:123:8:2026:5:espn-Hurt:ir',
  ))
})

it('confirms an activation from IR onto the bench', async () => {
  start()
  fireEvent.click(await enabledButton('Activate Healed from IR'))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText(/needs an open bench spot/)).toBeTruthy()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm activation' }))
  await waitFor(() => expect(triggerLineupSwap).toHaveBeenCalledWith(
    '8', [{ kind: 'activate_ir', player_id: 'espn-Healed', player_name: 'Healed', slot: 'BENCH' }],
    'lineup-ir:123:8:2026:5:espn-Healed:activate_ir',
  ))
})

it('sends nothing when the confirmation is cancelled', async () => {
  start()
  fireEvent.click(await enabledButton('Move Hurt to IR'))
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(triggerLineupSwap).not.toHaveBeenCalled()
})

it('reports a 202 as queued, not done, and refreshes the roster', async () => {
  start()
  fireEvent.click(await enabledButton('Move Hurt to IR'))
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm IR move' }))
  expect(await screen.findByText('Queued for ESPN, not confirmed yet.')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Track IR move' }).getAttribute('href')).toBe('/activity/actions/lineup-123')
  expect(screen.queryByRole('button', { name: 'Move Hurt to IR' })).toBeNull()
  await waitFor(() => expect(getLineupRoster).toHaveBeenCalledTimes(2))
  expect(screen.queryByText(/\b(moved|done)\b/i)).toBeNull()
})

it('says a duplicate was already queued', async () => {
  vi.mocked(triggerLineupSwap).mockResolvedValue({ status: 'duplicate', tracking_id: 'lineup-123' })
  start()
  fireEvent.click(await enabledButton('Move Hurt to IR'))
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm IR move' }))
  expect(await screen.findByText('Already queued for ESPN, not confirmed yet.')).toBeTruthy()
})

it('surfaces a 4xx rejection without claiming the move was queued', async () => {
  vi.mocked(triggerLineupSwap).mockRejectedValue(new ApiError(422, 'optimized_swaps.0.drop_player_id: Field required'))
  start()
  fireEvent.click(await enabledButton('Move Hurt to IR'))
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm IR move' }))
  expect(await within(dialog).findByText(/rejected this IR move: optimized_swaps.0.drop_player_id: Field required. Nothing was queued/)).toBeTruthy()
  expect(screen.queryByText(/Queued for ESPN/)).toBeNull()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(await enabledButton('Move Hurt to IR')).toBeTruthy()
})

it('reuses the idempotency key when retrying an unanswered request', async () => {
  vi.mocked(triggerLineupSwap).mockRejectedValueOnce(new ApiTimeoutError('/v1/trigger/lineup', 15_000))
  start()
  fireEvent.click(await enabledButton('Move Hurt to IR'))
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm IR move' }))
  expect(await within(dialog).findByText(/couldn't confirm the IR move was queued/)).toBeTruthy()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm IR move' }))
  await screen.findByText('Queued for ESPN, not confirmed yet.')
  const calls = vi.mocked(triggerLineupSwap).mock.calls
  expect(calls).toHaveLength(2)
  expect(calls[0][2]).toBe(calls[1][2])
})

it('sends once on a double-click of the confirmation', async () => {
  start()
  fireEvent.click(await enabledButton('Move Hurt to IR'))
  const confirm = within(await screen.findByRole('dialog')).getByRole('button', { name: 'Confirm IR move' })
  fireEvent.click(confirm)
  fireEvent.click(confirm)
  await screen.findByText('Queued for ESPN, not confirmed yet.')
  expect(triggerLineupSwap).toHaveBeenCalledTimes(1)
})

it('puts activation first while an active player blocks transactions', async () => {
  vi.mocked(getLineupRoster).mockResolvedValue({ ...roster, ir_blocking_transactions: true })
  start()
  const alert = await screen.findByRole('alert')
  expect(alert.textContent).toMatch(/Activate them first/)
  expect(within(alert).getByRole('button', { name: 'Activate Healed from IR' })).toBeTruthy()
  await enabledButton('Activate Healed from IR')
  expect((screen.getByRole('button', { name: 'Move Hurt to IR' }) as HTMLButtonElement).disabled).toBe(true)
})

it('keeps the ESPN fallback when blocked with no activation to offer', async () => {
  vi.mocked(getLineupRoster).mockResolvedValue({ starters: [player('Starter', 'RB')], bench: [], ir_blocking_transactions: true })
  start()
  expect((await screen.findByRole('alert')).textContent).toMatch(/Activate the player directly in ESPN/)
})

it('offers no IR action without an IR suggestion', async () => {
  vi.mocked(getLineupRoster).mockResolvedValue({
    starters: [player('Starter', 'RB', { ir_suggestion: null })], bench: [player('Backup', 'BE')],
  })
  start()
  await screen.findByText('Starter')
  expect(screen.queryByRole('button', { name: /IR$/ })).toBeNull()
})

it('disables IR actions for a planning week', async () => {
  start('/lineup?week=7')
  const button = await screen.findByRole('button', { name: 'Move Hurt to IR' }) as HTMLButtonElement
  await waitFor(() => expect(getCurrentWeek).toHaveBeenCalled())
  expect(button.disabled).toBe(true)
})

it('disables the IR action for a player with no ESPN id', async () => {
  vi.mocked(getLineupRoster).mockResolvedValue({ starters: [{ ...hurt, espn_id: '' }], bench: [] })
  start()
  const button = await screen.findByRole('button', { name: 'Move Hurt to IR' }) as HTMLButtonElement
  await waitFor(() => expect(getCurrentWeek).toHaveBeenCalled())
  expect(button.disabled).toBe(true)
})

it('sends nothing if the live week rolled over before confirming', async () => {
  start()
  fireEvent.click(await enabledButton('Move Hurt to IR'))
  vi.mocked(getCurrentWeek).mockResolvedValue({ week: 6 })
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm IR move' }))
  expect(await within(dialog).findByText(/can only be submitted for the current week/)).toBeTruthy()
  expect(triggerLineupSwap).not.toHaveBeenCalled()
})

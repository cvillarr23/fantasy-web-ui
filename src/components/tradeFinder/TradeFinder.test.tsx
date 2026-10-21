import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { queryClient } from '../../api/queryClient'
import { TradeFinder } from './TradeFinder'
import { candidates, candidate, finderConfig, finderContext, finderDeficits } from './fixtures'
import { completeScore } from '../tradeScore/fixtures'

let payload = candidates()
let failure = 0
const requests: URL[] = []
let scores = 0
let liveScore = completeScore()
beforeEach(() => {
  queryClient.clear()
  queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } })
  payload = candidates(); failure = 0; requests.length = 0; scores = 0; liveScore = completeScore()
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost')
    if (url.pathname === '/v1/trade/candidates') {
      requests.push(url)
      return new Response(JSON.stringify(failure ? { detail: 'Candidates unavailable' } : payload), { status: failure || 200 })
    }
    if (url.pathname === '/v1/trade/context') return new Response(JSON.stringify(finderContext))
    if (url.pathname === '/v1/roster/deficits') return new Response(JSON.stringify(finderDeficits))
    if (url.pathname === '/v1/trade/score') { scores++; return new Response(JSON.stringify(liveScore)) }
    throw new Error(`Unexpected request: ${url}`)
  }))
})
afterEach(() => { cleanup(); queryClient.clear(); vi.unstubAllGlobals() })
function view(props: Partial<React.ComponentProps<typeof TradeFinder>> = {}) {
  return <MantineProvider><MemoryRouter><TradeFinder config={finderConfig} week={5} {...props} /></MemoryRouter></MantineProvider>
}
function latest() { return Object.fromEntries(requests.at(-1)!.searchParams) }

it('browses the default proposable candidates and reports the whole-run count', async () => {
  const onCount = vi.fn()
  render(view({ onProposableCountChange: onCount }))
  expect(await screen.findByText('Received Wideout')).toBeTruthy()
  expect(latest()).toMatchObject({ league_id: '123', season: '2026', week: '5', status: 'proposable', sort: 'final_score', offset: '0' })
  expect(onCount).toHaveBeenLastCalledWith(18)
  expect(scores).toBe(0)
  expect(screen.getByText('Needs RB · deep at WR')).toBeTruthy()
  expect(screen.getByText('H2H wk 6')).toBeTruthy()
})
it('debounces every filter and resets paging, including clicking a team card', async () => {
  payload = candidates({ total: 80 })
  render(view())
  await screen.findByText('Received Wideout')
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() => expect(latest().offset).toBe('25'))
  const before = requests.length
  fireEvent.change(screen.getByLabelText('I get'), { target: { value: 'WR' } })
  fireEvent.change(screen.getByLabelText('I give'), { target: { value: 'RB' } })
  fireEvent.change(screen.getByLabelText('Shape'), { target: { value: '2for1' } })
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'needs_drop' } })
  fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'their_benefit' } })
  expect(requests.length).toBe(before)
  await waitFor(() => expect(latest()).toMatchObject({ receive_position: 'WR', send_position: 'RB', shape: '2for1', status: 'needs_drop', sort: 'their_benefit', offset: '0' }))
  fireEvent.click(screen.getByRole('button', { name: /^Rival Team/ }))
  await waitFor(() => expect(latest().counterparty_team_id).toBe('8'))
  expect(screen.getByLabelText('Team').getAttribute('value') ?? (screen.getByLabelText('Team') as HTMLSelectElement).value).toBe('8')
  fireEvent.click(screen.getByRole('button', { name: /^All teams/ }))
  await waitFor(() => expect(latest().counterparty_team_id).toBeUndefined())
})
it('keeps needs-drop and one-sided reason text distinct, with unknown reasons visible', async () => {
  payload = candidates({ items: [candidate({ status: 'needs_drop', reasons: ['exceeds_roster_limit'] }), candidate({ candidate_key: 'two', status: 'one_sided', reasons: ['hurts_counterparty', 'new_gate'] })] })
  render(view())
  expect(await within(screen.getByRole('table')).findByText('Needs a drop')).toBeTruthy()
  expect(screen.getByText(/Hurts them/)).toBeTruthy()
  expect(screen.getByText(/new gate/)).toBeTruthy()
})
it('explains a missing job separately from a completed empty run', async () => {
  failure = 404
  const mounted = render(view())
  expect(await screen.findByText(/has not run for week 5/)).toBeTruthy()
  expect(screen.queryByText(/No trades match/)).toBeNull()
  mounted.unmount(); queryClient.clear(); failure = 0; payload = candidates({ items: [], total: 0 })
  render(view())
  expect(await screen.findByText(/No trades match/)).toBeTruthy()
})
it('shows an error with retry without claiming the list is empty', async () => {
  failure = 503
  render(view())
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.queryByText(/No trades match/)).toBeNull()
  failure = 0
  fireEvent.click(screen.getByRole('button', { name: /retry/i }))
  expect(await screen.findByText('Received Wideout')).toBeTruthy()
})
it('warns when the computed snapshot is older than 36 hours', async () => {
  payload = candidates({ computed_at: new Date(Date.now() - 37 * 3600000).toISOString() })
  render(view())
  expect(await screen.findByText(/older than 36 hours/)).toBeTruthy()
})
it('loads live lineup evidence only on demand and links the exact package to roster review', async () => {
  render(view())
  await screen.findByText('Received Wideout')
  fireEvent.click(screen.getByRole('button', { name: 'Details' }))
  const rail = screen.getByRole('complementary', { name: 'Selected trade details' })
  expect(await within(rail).findByText(/Starting lineup changes/)).toBeTruthy()
  await waitFor(() => expect(scores).toBe(1))
  expect(await within(rail).findByText(/Live score/)).toBeTruthy()
  fireEvent.click(within(rail).getByRole('button', { name: 'Show their full lineup' }))
  expect(within(rail).getAllByText(/Sent Back/).length).toBeGreaterThan(0)
  expect(within(rail).getByRole('link', { name: 'Review roster impact' }).getAttribute('href')).toBe('/moves/review?kind=trade&week=5&add=200&drop=100')
})
it('opens an accessible week-by-week gain popover on focus', async () => {
  render(view())
  await screen.findByText('Received Wideout')
  fireEvent.focus(screen.getByRole('button', { name: 'Where our gain comes from' }))
  expect(await screen.findByRole('tooltip')).toBeTruthy()
  expect(await screen.findByText(/Where our \+12.6 comes from/)).toBeTruthy()
  expect(await screen.findByText('Wk 5')).toBeTruthy()
  expect(screen.getByText(/schedule boost is applied on top/)).toBeTruthy()
})
it('clears the selected package and filters when the week changes', async () => {
  const mounted = render(view())
  await screen.findByText('Received Wideout')
  fireEvent.click(screen.getByRole('button', { name: 'Details' }))
  mounted.rerender(view({ week: 6 }))
  await waitFor(() => expect(latest().week).toBe('6'))
  expect(screen.queryByRole('complementary')).toBeNull()
})

it('keeps a displaced starter visible as benched in the expanded lineup', async () => {
  liveScore.roster_impact.counterparty.weeks[0].starters_before.push({ espn_id: '999', player_id: 'p999', name: 'Benched Wideout', position: 'WR', vorp_score: 3 })
  render(view())
  await screen.findByText('Received Wideout')
  fireEvent.click(screen.getByRole('button', { name: 'Details' }))
  const rail = screen.getByRole('complementary', { name: 'Selected trade details' })
  fireEvent.click(await within(rail).findByRole('button', { name: 'Show their full lineup' }))
  expect(within(rail).getByText(/Benched Wideout.*to bench/)).toBeTruthy()
})

import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { TradeBuilder } from '../TradeBuilder'
import { useTradeContextControls } from '../../hooks/useTradeContextControls'
import { candidate, finderConfig, finderContext } from './fixtures'
import { completeScore } from '../tradeScore/fixtures'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
it('opens the selected sides in the builder and scores the exact package live on every prefill', async () => {
  const scored: unknown[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(input instanceof Request ? input.url : input, 'http://localhost').pathname
    if (path === '/v1/trade/score') { scored.push(JSON.parse(String(init?.body))); return new Response(JSON.stringify(completeScore())) }
    if (path === '/v1/trade/context') return new Response(JSON.stringify(finderContext))
    if (path === '/v1/league/current-week') return new Response(JSON.stringify({ week: 5 }))
    return new Response('{}')
  })
  function Harness() {
    const controls = useTradeContextControls(finderConfig)
    return <><button onClick={() => controls.prefillTrade!({ candidate: candidate(), week: 6, horizon: 3 })}>Prefill</button><TradeBuilder config={finderConfig} controls={controls} /></>
  }
  render(<MantineProvider><MemoryRouter initialEntries={['/trades?week=5']}><Harness /></MemoryRouter></MantineProvider>)
  fireEvent.click(screen.getByText('Prefill'))
  await waitFor(() => expect(scored).toHaveLength(1))
  expect(scored[0]).toEqual({ league_id: '123', season: 2026, week: 6, horizon: 3, our_team_id: '7', counterparty_team_id: '8', send_espn_ids: ['100'], receive_espn_ids: ['200'] })
  expect(screen.getByText('Received Wideout')).toBeTruthy()
  expect(screen.getByText('Sent Back')).toBeTruthy()
  expect(await screen.findByText(/Scored live just now/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Score trade' }))
  await waitFor(() => expect(scored).toHaveLength(2))
  await waitFor(() => expect(screen.queryByText(/Scored live just now/)).toBeNull())
  fireEvent.click(screen.getByText('Prefill'))
  await waitFor(() => expect(scored).toHaveLength(3))
  expect(await screen.findByText(/Scored live just now/)).toBeTruthy()
})

it('mounts the finder, reports its unfiltered count and expands the collapsed page builder', async () => {
  const { TradePage } = await import('../TradePage')
  const { DraftConfigContext } = await import('../../hooks/useDraftConfig')
  const { candidates, finderDeficits } = await import('./fixtures')
  const scored: unknown[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(input instanceof Request ? input.url : input, 'http://localhost').pathname
    if (path === '/v1/trade/candidates') return new Response(JSON.stringify(candidates()))
    if (path === '/v1/trade/context') return new Response(JSON.stringify(finderContext))
    if (path === '/v1/roster/deficits') return new Response(JSON.stringify(finderDeficits))
    if (path === '/v1/trade/offers') return new Response(JSON.stringify({ offers: [], total: 0 }))
    if (path === '/v1/trade/score') { scored.push(JSON.parse(String(init?.body))); return new Response(JSON.stringify(completeScore())) }
    return new Response('{}')
  })
  render(<MantineProvider><MemoryRouter initialEntries={['/trades?week=5']}>
    <DraftConfigContext.Provider value={{ config: finderConfig, loading: false, saveConfig: vi.fn(), setConfig: vi.fn() }}><TradePage /></DraftConfigContext.Provider>
  </MemoryRouter></MantineProvider>)
  expect(await screen.findByRole('link', { name: '18 proposable trades found' })).toBeTruthy()
  const builder = document.getElementById('builder') as HTMLDetailsElement
  expect(builder.open).toBe(false)
  fireEvent.click(await screen.findByRole('button', { name: 'Details' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Open in builder' }))
  await waitFor(() => expect(builder.open).toBe(true))
  expect(await screen.findByText(/Prefilled from the trade finder: Rival Team/)).toBeTruthy()
  await waitFor(() => expect(scored).toHaveLength(2))
  expect(scored[1]).toEqual({ league_id: '123', season: 2026, week: 5, horizon: 4, our_team_id: '7', counterparty_team_id: '8', send_espn_ids: ['100'], receive_espn_ids: ['200'] })
})

it('removes unmapped players individually using their ESPN identities', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('{}'))
  function Harness() {
    const controls = useTradeContextControls(finderConfig)
    const trade = candidate()
    trade.receive = [
      { ...trade.receive[0], player_id: null, name: 'First Unmapped' },
      { ...trade.receive[0], player_id: null, espn_id: '201', name: 'Second Unmapped' },
    ]
    return <><button onClick={() => controls.prefillTrade!({ candidate: trade, week: 5, horizon: 4 })}>Prefill</button><TradeBuilder config={finderConfig} controls={controls} /></>
  }
  render(<MantineProvider><MemoryRouter initialEntries={['/trades?week=5']}><Harness /></MemoryRouter></MantineProvider>)
  fireEvent.click(screen.getByText('Prefill'))
  fireEvent.click(screen.getAllByRole('button', { name: '✕' })[0])
  expect(screen.queryByText('First Unmapped')).toBeNull()
  expect(screen.getByText('Second Unmapped')).toBeTruthy()
})

import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { TradeBuilder } from '../TradeBuilder'
import { useTradeContextControls } from '../../hooks/useTradeContextControls'
import { candidate, finderConfig, finderContext } from './fixtures'
import { completeScore } from '../tradeScore/fixtures'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('opens the selected sides in the builder and scores the exact package live on every prefill', async () => {
  const scored: unknown[] = []
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const path = new URL(input, 'http://localhost').pathname
    if (path === '/v1/trade/score') { scored.push(JSON.parse(String(init?.body))); return new Response(JSON.stringify(completeScore())) }
    if (path === '/v1/trade/context') return new Response(JSON.stringify(finderContext))
    if (path === '/v1/league/current-week') return new Response(JSON.stringify({ week: 5 }))
    return new Response('{}')
  }))
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
  fireEvent.click(screen.getByText('Prefill'))
  await waitFor(() => expect(scored).toHaveLength(2))
})

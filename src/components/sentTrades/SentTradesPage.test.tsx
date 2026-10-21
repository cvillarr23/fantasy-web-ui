import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { DraftConfigContext } from '../../hooks/useDraftConfig'
import type { DraftConfig } from '../../api/types'
import { SentTradesPage } from './SentTradesPage'
import { sentConfig, sentOffer } from './fixtures'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })
function view(config: DraftConfig = sentConfig) {
  return <MantineProvider><MemoryRouter><DraftConfigContext.Provider value={{ config, loading: false, saveConfig: vi.fn(), setConfig: vi.fn() }}><SentTradesPage /></DraftConfigContext.Provider></MemoryRouter></MantineProvider>
}
function responses(mode: 'ok' | 'error' | 'loading') {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const path = new URL(url, 'http://test')
    if (path.pathname === '/v1/league/current-week') return new Response(JSON.stringify({ week: 6 }))
    if (path.pathname === '/v1/league/teams') return new Response(JSON.stringify({ teams: [] }))
    if (path.pathname === '/v1/trade/offers') {
      if (mode === 'loading') return new Promise<Response>(() => {})
      if (mode === 'error') return new Response(JSON.stringify({ detail: 'Unavailable' }), { status: 503 })
      return new Response(JSON.stringify({ offers: path.searchParams.get('status') === 'submit_blocked' ? [sentOffer({ status: 'submit_blocked' })] : [], limit: 100, offset: 0 }))
    }
    return new Response('{}')
  }))
}
it('shows a loading state and then the grouped offer history with team fallback', async () => {
  responses('ok')
  render(view())
  expect(screen.getByRole('status', { name: 'Loading sent trades' })).toBeTruthy()
  expect(await screen.findByRole('article', { name: 'Trade with Team 8' })).toBeTruthy()
})
it('keeps an initial load failure distinct from empty results and retries the read', async () => {
  responses('error')
  render(view())
  expect(await screen.findByText(/Could not load sent trades/)).toBeTruthy()
  expect(screen.queryByText(/No approved offers/)).toBeNull()
  responses('ok')
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(await screen.findByRole('article')).toBeTruthy()
})
it('keeps previous offers with an out-of-date warning after refresh fails', async () => {
  responses('ok')
  render(view())
  await screen.findByRole('article')
  responses('error')
  fireEvent.click(screen.getByRole('button', { name: 'Refresh offers' }))
  expect(await screen.findByText(/Previously loaded offers may be out of date/)).toBeTruthy()
  expect(screen.getByRole('article')).toBeTruthy()
})
it('removes previous-scope history immediately when configuration changes', async () => {
  responses('ok')
  const { rerender } = render(view())
  await screen.findByRole('article')
  responses('loading')
  rerender(view({ ...sentConfig, team_id: '9' }))
  expect(screen.queryByRole('article')).toBeNull()
  expect(screen.getByRole('status', { name: 'Loading sent trades' })).toBeTruthy()
})

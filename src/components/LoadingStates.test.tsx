import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { queryClient } from '../api/queryClient'
import { CONFIG_STORAGE_KEY } from '../hooks/useDraftConfig'
import { ActionDetailPage, ActivityPage, SessionDetailPage } from './ActivityPage'
import { AnalyticsPage } from './AnalyticsPage'
import { DraftConfigProvider } from './DraftConfigProvider'
import { LeaguePage } from './LeaguePage'
import { LineupPage } from './LineupPage'
import { MatchupPage } from './MatchupPage'
import { MoveOverviewPage } from './MoveOverviewPage'
import { ScoreboardPage } from './ScoreboardPage'
import { SettingsPage } from './SettingsPage'
import { WaiverPage } from './WaiverPage'

// Every API read and write hangs forever, so each page is frozen in its first-load state.
const { neverResolving } = vi.hoisted(() => {
  const API_CALL = /^(get|request|trigger|evaluate|search|set|start|pause|resume|end|query|preview|mark|check)/
  return {
    neverResolving: <T extends Record<string, unknown>>(actual: T): T =>
      Object.fromEntries(
        Object.entries(actual).map(([name, value]) => [
          name,
          typeof value === 'function' && API_CALL.test(name) ? vi.fn(() => new Promise(() => {})) : value,
        ]),
      ) as T,
  }
})
vi.mock('../api/client', async (importOriginal) => neverResolving(await importOriginal()))
vi.mock('../api/dashboard', async (importOriginal) => neverResolving(await importOriginal()))
vi.mock('@mantine/charts', () => ({ LineChart: () => null, BarChart: () => null }))

beforeEach(() => {
  localStorage.setItem(
    CONFIG_STORAGE_KEY,
    JSON.stringify({ league_id: '123', team_id: '8', season: 2026, mode: 'live' }),
  )
})
afterEach(() => {
  cleanup()
  localStorage.clear()
})

function renderAt(url: string, path: string, page: ReactElement) {
  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <DraftConfigProvider>
          <MemoryRouter initialEntries={[url]}>
            <Routes>
              <Route path={path} element={page} />
            </Routes>
          </MemoryRouter>
        </DraftConfigProvider>
      </QueryClientProvider>
    </MantineProvider>,
  )
}

const pages: [name: string, url: string, path: string, page: () => ReactElement][] = [
  ['League', '/league?week=5', '/league', () => <LeaguePage />],
  ['Waivers', '/waivers?week=5', '/waivers', () => <WaiverPage />],
  ['Lineup', '/lineup?week=5', '/lineup', () => <LineupPage />],
  ['Matchup', '/matchup?week=5', '/matchup', () => <MatchupPage />],
  ['Scoreboard', '/scoreboard?week=5', '/scoreboard', () => <ScoreboardPage />],
  ['Activity', '/activity', '/activity', () => <ActivityPage />],
  ['Submission detail', '/activity/actions/1', '/activity/actions/:id', () => <ActionDetailPage />],
  ['Session detail', '/activity/sessions/1', '/activity/sessions/:id', () => <SessionDetailPage />],
  ['Move review', '/moves/review?kind=waiver&week=5&add=1', '/moves/review', () => <MoveOverviewPage />],
  ['Analytics', '/analytics?week=5', '/analytics', () => <AnalyticsPage />],
  ['Settings', '/settings', '/settings', () => <SettingsPage />],
]

describe('first-load placeholders', () => {
  it.each(pages)('%s shows a busy skeleton region instead of loading text', async (_, url, path, page) => {
    const { container } = renderAt(url, path, page())
    await waitFor(() => expect(container.querySelector('[aria-busy="true"]')).not.toBeNull())
    expect(container.querySelector('.mantine-Skeleton-root')).not.toBeNull()
    expect(screen.queryByText(/loading/i)).toBeNull()
  })
})

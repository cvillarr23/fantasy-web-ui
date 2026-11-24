import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { getPlayerNews, getPlayerSummary } from '../../api/client'
import { queryClient } from '../../api/queryClient'
import { renderForTest } from '../jobs/renderForTest'
import { playerNews, playerSummary, playerSummaryLive } from '../../stories/fixtures'
import { PlayerSummaryPopover } from './PlayerSummaryPopover'

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  getPlayerSummary: vi.fn(),
  getPlayerNews: vi.fn(),
}))

beforeEach(() => {
  queryClient.clear()
  vi.mocked(getPlayerSummary).mockResolvedValue(playerSummaryLive)
  vi.mocked(getPlayerNews).mockResolvedValue(playerNews)
})
afterEach(cleanup)

const open = (props: Partial<Parameters<typeof PlayerSummaryPopover>[0]> = {}) =>
  renderForTest(<PlayerSummaryPopover playerId="p9002" onClose={vi.fn()} {...props} />)
const tab = (name: string) => screen.findByRole('tab', { name })

describe('PlayerSummaryPopover tabs', () => {
  it('starts on Summary and switches tabs, loading news only when News opens', async () => {
    open()
    expect(await screen.findByText('SF 20 – 14 SEA')).toBeTruthy()
    expect(getPlayerNews).not.toHaveBeenCalled()
    fireEvent.click(await tab('News'))
    expect(await screen.findByText(/full participant at Friday practice/)).toBeTruthy()
    expect(getPlayerNews).toHaveBeenCalledWith('p9002')
    expect(screen.queryByText('SF 20 – 14 SEA')).toBeNull()
    fireEvent.click(await tab('Stats'))
    expect(await screen.findByRole('table', { name: "This week's scoring breakdown" })).toBeTruthy()
  })

  it('shows the injury callout and hides tiles the data does not support', async () => {
    vi.mocked(getPlayerSummary).mockResolvedValue(playerSummary)
    open()
    expect(await screen.findByText('QUESTIONABLE')).toBeTruthy()
    expect(screen.queryByText('This week')).toBeNull()
    expect(screen.queryByText('Season avg')).toBeNull()
    expect(screen.queryByText('ESPN rostered')).toBeNull()
  })

  it('shows live tiles and opens game details only when a handler is given', async () => {
    const onOpenGame = vi.fn()
    const { unmount } = open({ onOpenGame })
    expect(await screen.findByText('This week')).toBeTruthy()
    expect(screen.getByText('Proj 16.0')).toBeTruthy()
    expect(screen.getByText('Started 90%')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open game details →' }))
    expect(onOpenGame).toHaveBeenCalledWith('evt-1')
    unmount()
    open()
    await screen.findByText('This week')
    expect(screen.queryByRole('button', { name: 'Open game details →' })).toBeNull()
  })
})

describe('News tab', () => {
  it('renders source, author, headline, outbound link and also-reported-by', async () => {
    open()
    fireEvent.click(await tab('News'))
    expect(await screen.findByText('Beat reporter')).toBeTruthy()
    expect(screen.getByText(/Also reported by RotoWire, r\/fantasyfootball/)).toBeTruthy()
    const link = screen.getByRole('link', { name: /Read on ESPN/ })
    expect(link.getAttribute('href')).toBe('https://example.com/espn')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener')
    expect(screen.getAllByRole('link')).toHaveLength(2)
  })

  it('says so when there is no news', async () => {
    vi.mocked(getPlayerNews).mockResolvedValue([])
    open()
    fireEvent.click(await tab('News'))
    expect(await screen.findByText('No news in the last 7 days.')).toBeTruthy()
  })

  it('shows a loading region, then an error when the feed fails', async () => {
    vi.mocked(getPlayerNews).mockRejectedValue(new Error('boom'))
    open()
    fireEvent.click(await tab('News'))
    expect(screen.getByRole('status', { name: 'Loading news' })).toBeTruthy()
    await waitFor(() => expect(screen.getByText(/Failed to load news/)).toBeTruthy(), { timeout: 4000 })
  })
})

describe('Stats tab', () => {
  it('totals the breakdown, including negative lines, and averages the last weeks', async () => {
    open({ onOpenScoringGuide: vi.fn() })
    fireEvent.click(await tab('Stats'))
    const breakdown = await screen.findByRole('table', { name: "This week's scoring breakdown" })
    expect(breakdown.textContent).toContain('−2.0')
    const total = Array.from(breakdown.querySelectorAll('tr')).find((r) => r.textContent?.startsWith('Total'))
    expect(total?.textContent).toBe('Total11.8')
    const log = screen.getByRole('table', { name: 'Recent weekly fantasy points' })
    expect(log.textContent).toContain('15.8')
    expect(screen.getByRole('button', { name: 'How is this scored?' })).toBeTruthy()
  })

  it('skips the breakdown when core has not served it', async () => {
    vi.mocked(getPlayerSummary).mockResolvedValue(playerSummary)
    open()
    fireEvent.click(await tab('Stats'))
    expect(await screen.findByText('No stats yet for this player.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'How is this scored?' })).toBeNull()
  })
})

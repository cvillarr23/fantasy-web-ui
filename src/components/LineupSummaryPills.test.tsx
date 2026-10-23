import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { LineupSummaryPills } from './LineupSummaryPills'

afterEach(cleanup)

const view = (props: Partial<Parameters<typeof LineupSummaryPills>[0]> = {}) => render(
  <MantineProvider>
    <LineupSummaryPills suggestedChanges={2} injuredStarters={1} byeCrunchWeeks={[9, 12]} shortfalls={[{ position: 'TE', short: 1 }]} {...props} />
  </MantineProvider>,
)

it('counts what needs attention and links each pill to its section', () => {
  view()
  expect(screen.getByRole('link', { name: '2 suggested changes' }).getAttribute('href')).toBe('#set-lineup')
  expect(screen.getByRole('link', { name: '1 injured starter' }).getAttribute('href')).toBe('#set-lineup')
  expect(screen.getByRole('link', { name: 'Bye crunch: weeks 9, 12' }).getAttribute('href')).toBe('#bye-crunch')
  expect(screen.getByRole('link', { name: '1 position short' }).getAttribute('href')).toBe('#deficits')
})

it('says so while counts load, and when they could not be read', () => {
  view({ suggestedChanges: undefined, injuredStarters: undefined, byeCrunchWeeks: undefined, shortfalls: undefined })
  for (const text of ['… suggested changes', '… injured starters', '… bye outlook', '… roster positions']) {
    expect(screen.getByText(text)).toBeTruthy()
  }
  cleanup()
  view({ suggestedChanges: null, injuredStarters: null, byeCrunchWeeks: null, shortfalls: null })
  for (const text of ['Suggested changes unavailable', 'Injured starters unavailable', 'Bye outlook unavailable', 'Roster positions unavailable']) {
    expect(screen.getByText(text)).toBeTruthy()
  }
})

it('reports a clean week without making the quiet pills links', () => {
  view({ suggestedChanges: 0, injuredStarters: 0, byeCrunchWeeks: [], shortfalls: [] })
  expect(screen.getByText('0 suggested changes')).toBeTruthy()
  expect(screen.getByText('No injured starters')).toBeTruthy()
  expect(screen.getByText('No bye crunch ahead').closest('a')).toBeNull()
  expect(screen.getByText('All positions covered').closest('a')).toBeNull()
})

it('tells the page which section a pill opens', () => {
  const onNavigate = vi.fn()
  view({ onNavigate })
  fireEvent.click(screen.getByRole('link', { name: '1 position short' }))
  expect(onNavigate).toHaveBeenCalledWith('deficits')
})

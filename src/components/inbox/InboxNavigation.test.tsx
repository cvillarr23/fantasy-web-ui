import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MantineProvider } from '@mantine/core'
import { MemoryRouter } from 'react-router-dom'
import { Layout } from '../Layout'
import App from '../../App'
vi.mock('../ActivityPage', () => ({
  ActivityIndicator: () => null,
  ActivityPage: () => null,
  ActionDetailPage: () => null,
  SessionDetailPage: () => null,
}))
vi.mock('./TradeInboxPage', () => ({
  TradeInboxPage: () => <div>Incoming inbox route</div>,
}))
vi.mock('../DraftConfigProvider', () => ({
  DraftConfigProvider: ({ children }: { children: React.ReactNode }) => children,
}))
afterEach(() => {
  cleanup()
  window.history.replaceState(null, '', '/')
})
it('includes Inbox beside Trades in desktop and mobile navigation', async () => {
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={['/inbox']}>
        <Layout />
      </MemoryRouter>
    </MantineProvider>,
  )
  expect(screen.getByRole('link', { name: 'Inbox' }).getAttribute('href')).toBe('/inbox')
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
  await waitFor(() => expect(screen.getAllByRole('link', { name: 'Inbox' }).length).toBe(2))
})
it('loads the inbox through the application route', async () => {
  window.history.replaceState(null, '', '/inbox')
  render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  )
  expect(await screen.findByText('Incoming inbox route')).toBeTruthy()
})

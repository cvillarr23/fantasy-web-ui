import { AppShell } from '@mantine/core'
import { NavLink, Outlet } from 'react-router-dom'

const NAV_LINKS = [
  { to: '/draft', label: 'Draft Day' },
  { to: '/practice', label: 'Practice Draft' },
  { to: '/lineup', label: 'Lineup' },
  { to: '/matchup', label: 'Matchup' },
  { to: '/trades', label: 'Trades' },
  { to: '/chat', label: 'Chat' },
  { to: '/waivers', label: 'Waivers' },
  { to: '/analytics', label: 'Analytics' },
]

// Plain nav links (not Mantine's Tabs) are deliberate: these switch the whole page via the
// router, they don't switch panels within one view, so the ARIA tabs/tabpanel pattern Tabs
// implements doesn't apply here - a screen reader would announce tabs with no associated
// tabpanel content, since the routed content renders via <Outlet> outside any Tabs tree.
// NavLink's own route matching (rather than a manual pathname === value comparison) also
// means a trailing-slash URL still highlights the right link.
export function Layout() {
  return (
    <AppShell header={{ height: 56 }}>
      <AppShell.Header>
        <nav className="app-nav">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}

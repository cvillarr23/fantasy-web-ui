import { AppShell, Tabs } from '@mantine/core'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const NAV_TABS = [
  { value: '/draft', label: 'Draft Day' },
  { value: '/practice', label: 'Practice Draft' },
  { value: '/lineup', label: 'Lineup' },
  { value: '/waivers', label: 'Waivers' },
]

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <AppShell header={{ height: 56 }}>
      <AppShell.Header>
        <Tabs value={location.pathname} onChange={(value) => value && navigate(value)} px="md">
          <Tabs.List>
            {NAV_TABS.map((tab) => (
              <Tabs.Tab key={tab.value} value={tab.value}>
                {tab.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}

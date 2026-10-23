import { ActivityIndicator } from './ActivityPage'
import { useState } from 'react'
import { AppShell, Burger, Drawer, Group, Text } from '@mantine/core'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useDraftConfig } from '../hooks/useDraftConfig'

const GROUPS = [
  {
    title: 'Your team',
    links: [
      ['/lineup', 'Lineup'],
      ['/matchup', 'Matchup'],
      ['/waivers', 'Waivers'],
      ['/trades', 'Trades'],
      ['/inbox', 'Inbox'],
    ],
  },
  {
    title: 'League',
    links: [
      ['/scoreboard', 'Scoreboard'],
      ['/league', 'Standings & leaders'],
    ],
  },
  {
    title: 'Activity',
    links: [
      ['/activity', 'Submissions & sessions'],
      ['/chat', 'Assistant'],
    ],
  },
  {
    title: 'Draft',
    links: [
      ['/draft', 'Draft Day'],
      ['/practice', 'Practice Draft'],
    ],
  },
  {
    title: 'Tools',
    links: [
      ['/analytics', 'Analytics'],
      ['/settings', 'Settings'],
    ],
  },
]
export function Layout() {
  const [opened, setOpened] = useState(false)
  const location = useLocation()
  const { config } = useDraftConfig()
  const title =
    GROUPS.flatMap((g) => g.links).find(([to]) => location.pathname.startsWith(to))?.[1] ??
    'Move overview'
  const navigation = (
    <nav aria-label="Main navigation" className="side-navigation">
      {GROUPS.map((group) => (
        <section key={group.title}>
          <Text size="xs" tt="uppercase" c="dimmed" fw={700}>
            {group.title}
          </Text>
          {group.links.map(([to, label]) => (
            <NavLink key={to} to={to} onClick={() => setOpened(false)}>
              {label}
            </NavLink>
          ))}
        </section>
      ))}
    </nav>
  )
  return (
    <AppShell
      header={{ height: 68 }}
      navbar={{ width: 230, breakpoint: 900, collapsed: { mobile: true } }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              className="mobile-menu"
              opened={opened}
              onClick={() => setOpened(!opened)}
              aria-label="Open navigation"
            />
            <Text fw={700}>{title}</Text>
          </Group>
          <ActivityIndicator />
          <Text size="xs" c="dimmed">
            {config.league_id
              ? `League ${config.league_id} · Team ${config.team_id}`
              : 'Configure your league'}
          </Text>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar>
        <AppShell.Section grow style={{ overflowY: 'auto' }}>
          {navigation}
        </AppShell.Section>
      </AppShell.Navbar>
      <Drawer opened={opened} onClose={() => setOpened(false)} title="Fantasy manager" size="xs">
        {navigation}
      </Drawer>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}

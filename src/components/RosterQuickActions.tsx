import { Button, Group } from '@mantine/core'
import { Link } from 'react-router-dom'

export function RosterQuickActions({ page, week }: {
  page: 'lineup' | 'waivers' | 'trades'
  week: number | string
}) {
  const value = Number(week)
  const valid = Number.isInteger(value) && value > 0
  const query = valid ? `?week=${value}` : ''
  return (
    <Group gap="xs" aria-label="Roster tools">
      {page !== 'lineup' && (
        <Button component={Link} to={`/lineup${query}`} variant="subtle" size="xs">
          Back to lineup{valid ? ` · Week ${value}` : ''}
        </Button>
      )}
      {page !== 'waivers' && (
        <Button component={Link} to={`/waivers${query}`} variant="light" size="xs">Find waiver upgrades</Button>
      )}
      {page !== 'trades' && (
        <Button component={Link} to={`/trades${query}`} variant="light" size="xs">Evaluate trade</Button>
      )}
    </Group>
  )
}

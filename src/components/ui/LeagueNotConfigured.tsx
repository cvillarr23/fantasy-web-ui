import { Button, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { PageHeader } from './PageHeader'

/** Shown by league-scoped pages until Settings has a league and team. Pages keep their own
 * config check and show `PageSkeleton` while the config is still loading. */
export function LeagueNotConfigured({ title }: { title?: string }) {
  return (
    <div className="dashboard">
      {title && <PageHeader title={title} level={1} />}
      <Stack gap="md" mt="xl" align="center">
        <Text ta="center" maw={480}>
          No league configured yet. Set your league and team in Settings first.
        </Text>
        <Button component={Link} to="/settings" variant="default">Go to Settings</Button>
      </Stack>
    </div>
  )
}

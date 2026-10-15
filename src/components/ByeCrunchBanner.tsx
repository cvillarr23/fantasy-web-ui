import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Group, List, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { queryClient } from '../api/queryClient'
import { byeOutlookQuery } from '../api/weekReads'
import type { DraftConfig, TeamByeOutlook } from '../api/types'

function crunchReason(week: TeamByeOutlook['weeks'][number]) {
  if (week.unfilled_slots.length)
    return `leaves ${week.unfilled_slots.join(', ')} ${week.unfilled_slots.length > 1 ? 'slots' : 'slot'} empty`
  return 'forces a below-replacement starter'
}

/** Weeks ahead where our players' NFL byes leave the lineup short. Shown only when there is one;
 * fixes are recommendations on the waiver and trade pages, never automatic. */
export function ByeCrunchSummary({ outlook }: { outlook: TeamByeOutlook }) {
  const crunch = outlook.weeks.filter((week) => week.crunch)
  if (!crunch.length) return null
  const names = new Map(outlook.players.map((player) => [player.espn_id, player.name ?? `ESPN player ${player.espn_id}`]))
  return (
    <Alert color="orange" mb="md" title="Bye-week crunch ahead">
      <List size="sm" spacing={2} mb="xs">
        {crunch.map((week) => (
          <List.Item key={week.week}>
            <Text span fw={600}>Week {week.week}</Text>
            {`: ${week.on_bye.map((id) => names.get(id) ?? id).join(', ')} on bye ${crunchReason(week)}.`}
          </List.Item>
        ))}
      </List>
      <Group gap="xs">
        <Button component={Link} to={`/waivers?week=${outlook.start_week}`} size="xs" variant="light">
          Find a fill-in
        </Button>
        <Button component={Link} to="/trades" size="xs" variant="subtle">
          Look for a trade
        </Button>
      </Group>
    </Alert>
  )
}

/** Best-effort, like the matchup banner: a failed outlook hides the banner, never the page. */
export function ByeCrunchBanner({ config, week }: { config: DraftConfig; week: number }) {
  const query = useQuery(byeOutlookQuery(config, week), queryClient)
  return Array.isArray(query.data?.weeks) ? <ByeCrunchSummary outlook={query.data} /> : null
}

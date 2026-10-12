import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryClient } from '../api/queryClient'
import { Alert, Button, Group, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { matchupQuery as matchupOptions, rosterDeficitsQuery } from '../api/weekReads'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { LineupEditor } from './LineupEditor'
import { RosterDeficitsGrid } from './RosterDeficitsGrid'
import { WeekSelector } from './ui/WeekSelector'
import { PageSkeleton } from './skeletons'

export function LineupPage() {
  const { config, loading: configLoading } = useDraftConfig()
  const isConfigured = Boolean(config.league_id && config.team_id)

  const [week, setWeek] = useSelectedWeek()
  const weekValue = Number(week)
  const validWeek = Number.isFinite(weekValue) && weekValue > 0
  const enabled = isConfigured && validWeek

  // Same keys as the waiver and matchup pages, so moving between them reuses the cache.
  const deficitsQuery = useQuery(
    { ...rosterDeficitsQuery(config, weekValue), placeholderData: keepPreviousData },
    queryClient,
  )
  // Best-effort matchup context banner - omitted entirely on a bye week (cached as null) or
  // any failure rather than shown as an error, since lineup editing must keep working without it.
  const matchupQuery = useQuery(matchupOptions(config, weekValue), queryClient)
  const deficits = deficitsQuery.data ?? null
  const loading = enabled && deficitsQuery.isPending
  const error = deficitsQuery.error ? String(deficitsQuery.error) : null
  const matchup = matchupQuery.data ?? null

  if (!isConfigured) {
    if (configLoading) return <PageSkeleton />
    return (
      <div className="dashboard">
        <Stack gap="md" mt="xl" align="center">
          <Text ta="center" maw={480}>
            No league configured yet. Set your league and team in Settings first.
          </Text>
          <Button component={Link} to="/settings" variant="default">Go to Settings</Button>
        </Stack>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <Group justify="space-between" align="center" mb="md">
        <WeekSelector week={week} onChange={setWeek} />
        {matchup && (
          <Button component={Link} to={`/matchup?week=${weekValue}`} variant="subtle" size="xs">
            View matchup vs {matchup.opponent.team.name}
          </Button>
        )}
      </Group>
      {error && <Alert color="red" mb="md">{error}</Alert>}
      {(loading || deficits) && (
        <RosterDeficitsGrid
          deficits={deficits}
          myTeamId={config.team_id}
          loading={loading}
          updating={deficitsQuery.isPlaceholderData}
        />
      )}
      <LineupEditor key={`${config.league_id}:${config.team_id}:${config.season}`} config={config} week={week} />
    </div>
  )
}

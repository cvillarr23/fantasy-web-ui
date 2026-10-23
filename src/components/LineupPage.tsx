import { useEffect, useRef } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryClient } from '../api/queryClient'
import { Alert, Button, Group, Stack } from '@mantine/core'
import { Link } from 'react-router-dom'
import { byeOutlookQuery, lineupRosterQuery, matchupQuery as matchupOptions, rosterDeficitsQuery } from '../api/weekReads'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { ByeCrunchBanner } from './ByeCrunchBanner'
import { LineupEditor } from './LineupEditor'
import { LineupSummaryPills } from './LineupSummaryPills'
import { buildSuggestions } from './lineupSuggestions'
import { injuredStarterCount, positionShortfalls } from './lineupSummary'
import { RosterDeficitsGrid } from './RosterDeficitsGrid'
import { WeekSelector } from './ui/WeekSelector'
import { PageSkeleton } from './skeletons'
import { LeagueNotConfigured } from './ui/LeagueNotConfigured'
import { PageHeader } from './ui/PageHeader'

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
  // The editor reads the same roster entry; the header pills only count from it.
  const rosterQuery = useQuery(lineupRosterQuery(config, week), queryClient)
  const byeQuery = useQuery(byeOutlookQuery(config, weekValue), queryClient)
  const deficits = deficitsQuery.data ?? null
  const loading = enabled && deficitsQuery.isPending
  const error = deficitsQuery.error ? String(deficitsQuery.error) : null
  const matchup = matchupQuery.data ?? null

  // The deficits panel is collapsed, so a pill (or a link with #deficits) has to open it.
  const deficitsRef = useRef<HTMLDetailsElement>(null)
  const openDeficits = () => { if (deficitsRef.current) deficitsRef.current.open = true }
  useEffect(() => {
    const openOnHash = () => { if (window.location.hash === '#deficits') openDeficits() }
    openOnHash()
    window.addEventListener('hashchange', openOnHash)
    return () => window.removeEventListener('hashchange', openOnHash)
  }, [])

  if (!isConfigured) {
    if (configLoading) return <PageSkeleton title="Lineup" />
    return <LeagueNotConfigured title="Lineup" />
  }

  const roster = rosterQuery.data
  const pendingOrFailed = <T,>(query: { isError: boolean }): T | null | undefined => (query.isError ? null : undefined)
  const byeOutlook = byeQuery.data
  const myDeficits = deficits?.teams[config.team_id] ? deficits : null

  return (
    <div className="dashboard">
      <Stack gap="lg">
        <PageHeader
          title="Lineup"
          level={1}
          subtitle={`Week ${validWeek ? weekValue : '—'}`}
          actions={(
            <Group gap="sm">
              {matchup && (
                <Button component={Link} to={`/matchup?week=${weekValue}`} variant="subtle" size="xs">
                  View matchup vs {matchup.opponent.team.name}
                </Button>
              )}
              <WeekSelector week={week} onChange={setWeek} />
            </Group>
          )}
        />
        <LineupSummaryPills
          suggestedChanges={roster ? buildSuggestions(roster).length : pendingOrFailed<number>(rosterQuery)}
          injuredStarters={roster ? injuredStarterCount(roster) : pendingOrFailed<number>(rosterQuery)}
          byeCrunchWeeks={Array.isArray(byeOutlook?.weeks)
            ? (byeOutlook.schedule_known ? byeOutlook.crunch_weeks : null)
            : pendingOrFailed<number[]>(byeQuery)}
          shortfalls={deficits
            ? (myDeficits ? positionShortfalls(myDeficits, config.team_id) : null)
            : pendingOrFailed<ReturnType<typeof positionShortfalls>>(deficitsQuery)}
          onNavigate={(id) => { if (id === 'deficits') openDeficits() }}
        />
        {error && <Alert color="red">{error}</Alert>}
        <LineupEditor
          key={`${config.league_id}:${config.team_id}:${config.season}`}
          config={config}
          week={week}
          banner={enabled && <ByeCrunchBanner config={config} week={weekValue} />}
        />
        <details className="trade-section" id="deficits" ref={deficitsRef}>
          <summary>Roster deficits</summary>
          {(loading || deficits) && (
            <RosterDeficitsGrid
              deficits={deficits}
              myTeamId={config.team_id}
              loading={loading}
              updating={deficitsQuery.isPlaceholderData}
            />
          )}
        </details>
      </Stack>
    </div>
  )
}

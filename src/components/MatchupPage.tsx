import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryClient } from '../api/queryClient'
import { Badge, Button, Group, Skeleton, Table, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { matchupQuery } from '../api/weekReads'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { WeekSelector } from './ui/WeekSelector'
import { PageSkeleton, SkeletonRegion, TableRowsSkeleton } from './skeletons'
import { LeagueNotConfigured } from './ui/LeagueNotConfigured'
import { PageHeader } from './ui/PageHeader'
import { EmptyState } from './ui/EmptyState'
import { ErrorAlert } from './ui/ErrorAlert'
import { formatNumber } from './ui/formatNumber'
import { MatchupSummary } from './matchup/MatchupSummary'
import { MatchupTeamCard } from './matchup/MatchupTeamCard'
import { isZeroProjection, projectedMargin, winChance } from './matchup/matchupFormat'
import { matchupGlossary } from './matchup/matchupGlossary'

const MATCHUP_COLUMNS = ['Slot', 'Player', 'Pos', 'Actual', 'Projected']

function MatchupSkeleton() {
  return (
    <SkeletonRegion label="Loading matchup">
      <div className="matchup-summary">
        {[0, 1].map((i) => (
          <div key={i} className="matchup-summary-team">
            <Skeleton height={40} width={40} radius={6} />
            <div>
              <Skeleton height={12} width={72} mb={6} />
              <Skeleton height={20} width={140} mb={6} />
              <Skeleton height={28} width={120} />
            </div>
          </div>
        ))}
      </div>
      <div className="matchup-columns">
        {['Your team', 'Opponent'].map((label) => (
          <section key={label} className="matchup-team-card">
            <header className="matchup-team-header">
              <Skeleton height={40} width={40} radius={6} />
              <div>
                <div className="matchup-team-label">{label}</div>
                <Skeleton height={20} width={140} mt={4} />
              </div>
            </header>
            <Table className="desktop-matchup-table">
              <Table.Thead>
                <Table.Tr>
                  {MATCHUP_COLUMNS.map((heading) => <Table.Th key={heading}>{heading}</Table.Th>)}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <TableRowsSkeleton columns={MATCHUP_COLUMNS.length} rows={9} />
              </Table.Tbody>
            </Table>
          </section>
        ))}
      </div>
    </SkeletonRegion>
  )
}

export function MatchupPage() {
  const { config, loading: configLoading } = useDraftConfig()
  const isConfigured = Boolean(config.league_id && config.team_id)

  const [week, setWeek] = useSelectedWeek()
  const weekValue = Number(week)
  const validWeek = Number.isFinite(weekValue) && weekValue > 0

  // The previous week stays visible (dimmed) while the next one loads, so a week change reads
  // as "updating" rather than a no-op or a blank page.
  const query = useQuery({ ...matchupQuery(config, weekValue), placeholderData: keepPreviousData }, queryClient)
  const matchup = query.data ?? null
  // null is a cached bye week (or a week the season hasn't reached), not a failure.
  const notFound = query.data === null
  const error = query.error ? String(query.error) : null
  // A failed refresh keeps the last matchup on screen, dimmed, under an error with Retry.
  const stale = Boolean(error && matchup)

  if (!isConfigured) {
    if (configLoading) return <PageSkeleton title="Matchup" />
    return <LeagueNotConfigured title="Matchup" />
  }

  const margin = matchup ? projectedMargin(matchup.our_team.team.projected, matchup.opponent.team.projected) : null
  const chance = winChance(margin)
  const zeroStarters = matchup
    ? matchup.our_team.starters.filter((line) => isZeroProjection(line.projected_points)).length
    : 0
  // Counts that are still loading or failed say so, instead of reading as zero.
  const pending = !matchup && query.isPending
  const marginLabel = pending
    ? 'Projected margin …'
    : margin == null ? 'Projected margin unavailable' : `Projected margin ${formatNumber(margin, { signed: true })}`
  const chanceLabel = pending
    ? 'Win chance …'
    : chance == null ? 'Win chance unavailable' : `Win chance ~${chance}% (estimate)`

  return (
    <div className="dashboard">
      <PageHeader
        title="Matchup"
        level={1}
        subtitle={matchup ? `Week ${matchup.week} · ${matchup.our_team.team.name} vs ${matchup.opponent.team.name}` : validWeek ? `Week ${weekValue}` : undefined}
      />
      {(matchup || pending || error) && (
        <Group gap="xs" my="md" className="matchup-pills">
          <Badge component="a" href="#matchup-summary" size="lg" variant="light">{marginLabel}</Badge>
          <Badge component="a" href="#matchup-summary" size="lg" color="teal" variant="light">{chanceLabel}</Badge>
          {zeroStarters > 0 && (
            <Badge component="a" href="#matchup-yours" size="lg" color="red" variant="light">
              {zeroStarters} {zeroStarters === 1 ? 'starter' : 'starters'} projected 0.0
            </Badge>
          )}
        </Group>
      )}
      <Group justify="space-between" align="center" mb="md">
        <WeekSelector week={week} onChange={setWeek} />
        <Button component={Link} to={`/lineup?week=${weekValue}`}>
          Edit lineup for this week
        </Button>
      </Group>
      {error && (
        <ErrorAlert mb="md" onRetry={() => void query.refetch()}>
          {stale ? `Could not refresh this matchup. Showing the last data loaded. ${error}` : error}
        </ErrorAlert>
      )}
      {notFound && (
        <EmptyState tone="alert">No matchup found for this week (bye week, or the season hasn't reached it yet).</EmptyState>
      )}
      {query.isPending && validWeek && !matchup && <MatchupSkeleton />}
      {matchup && (
        <div className={stale ? 'matchup-stale' : undefined} aria-busy={query.isPlaceholderData || undefined}>
          <MatchupSummary ours={matchup.our_team.team} opponent={matchup.opponent.team} />
          <Text size="sm" c="dimmed" mb="md">
            <strong>Actual</strong>: {matchupGlossary.actual} <strong>Projected</strong>: {matchupGlossary.projected}
          </Text>
          <div className="matchup-columns">
            <MatchupTeamCard id="matchup-yours" side={matchup.our_team} label="Your team" />
            <MatchupTeamCard id="matchup-theirs" side={matchup.opponent} label="Opponent" />
          </div>
        </div>
      )}
    </div>
  )
}

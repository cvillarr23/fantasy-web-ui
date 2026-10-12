import { ScoreValue } from './ui/ScoreValue'
import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryClient } from '../api/queryClient'
import { Alert, Button, Group, Skeleton, Stack, Table, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { matchupQuery } from '../api/weekReads'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { DeficitBadge, SwapBadge } from './player/DeficitBadge'
import { PlayerCard } from './player/PlayerCard'
import { WeekSelector } from './ui/WeekSelector'
import { PageSkeleton, SkeletonRegion, TableRowsSkeleton } from './skeletons'
import type { MatchupTeamSide, PlayerLine } from '../api/types'

function PlayerRow({ line }: { line: PlayerLine }) {
  return (
    <PlayerCard
      variant="tableRow"
      before={line.slot}
      player={{
        id: line.player_id,
        name: line.name,
        position: line.position,
        headshotUrl: line.headshot_url,
        jersey: line.jersey,
      }}
      badges={
        <>
          <DeficitBadge isDeficit={line.deficit_flag} />
          <SwapBadge benchFor={line.suggested_swap?.bench_for} />
        </>
      }
      stats={
        <span className="score-pair">
          <ScoreValue value={line.points} />
          <ScoreValue value={line.projected_points} projected />
        </span>
      }
    />
  )
}

function MobilePlayer({ line }: { line: PlayerLine }) {
  return (
    <div className="matchup-mobile-player">
      <div>
        <Text size="xs" c="dimmed">
          {line.slot} · {line.position}
        </Text>
        <Text fw={600}>{line.name}</Text>
        <DeficitBadge isDeficit={line.deficit_flag} />
      </div>
      <span className="score-pair">
        <ScoreValue value={line.points} />
        <ScoreValue value={line.projected_points} projected />
      </span>
    </div>
  )
}

const MATCHUP_COLUMNS = ['Slot', '', 'Player', 'Pos', '#', 'Fantasy points']

function MatchupColumnsSkeleton() {
  return (
    <SkeletonRegion label="Loading matchup" className="matchup-columns">
      {['Your team', 'Opponent'].map((label) => (
        <section key={label} className="matchup-team-card">
          <header className="matchup-team-header">
            <Skeleton height={40} width={40} radius={6} />
            <div>
              <div className="matchup-team-label">{label}</div>
              <Skeleton height={20} width={140} mt={4} />
            </div>
            <div className="matchup-team-score">
              <Skeleton height={24} width={56} mb={4} />
              <Skeleton height={12} width={56} />
            </div>
          </header>
          <Table className="desktop-matchup-table">
            <Table.Thead>
              <Table.Tr>
                {MATCHUP_COLUMNS.map((heading, i) => <Table.Th key={i}>{heading}</Table.Th>)}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <TableRowsSkeleton columns={MATCHUP_COLUMNS.length} rows={9} />
            </Table.Tbody>
          </Table>
        </section>
      ))}
    </SkeletonRegion>
  )
}

function TeamCard({ side, label }: { side: MatchupTeamSide; label: string }) {
  const [benchOpen, setBenchOpen] = useState(false)

  return (
    <section className="matchup-team-card" aria-label={`${label}: ${side.team.name}`}>
      <header className="matchup-team-header">
        <img src={side.team.logo_url} alt="" width={40} height={40} className="matchup-team-logo" />
        <div>
          <div className="matchup-team-label">{label}</div>
          <h3>{side.team.name}</h3>
        </div>
        <div className="matchup-team-score">
          <div className="matchup-score-actual">{side.team.score.toFixed(1)}</div>
          <div className="matchup-score-projected">proj {side.team.projected.toFixed(1)}</div>
        </div>
      </header>
      <div className="matchup-player-cards">
        {side.starters.map((line) => (
          <MobilePlayer key={line.player_id} line={line} />
        ))}
      </div>
      <Table className="desktop-matchup-table">
        <Table.Thead>
          <Table.Tr>
            {MATCHUP_COLUMNS.map((heading, i) => <Table.Th key={i}>{heading}</Table.Th>)}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {side.starters.map((line) => <PlayerRow key={line.player_id} line={line} />)}
        </Table.Tbody>
      </Table>
      <Button variant="subtle" size="xs" mt="xs" onClick={() => setBenchOpen((open) => !open)}>
        {benchOpen ? 'Hide' : 'Show'} bench ({side.bench.length})
      </Button>
      {benchOpen && (
        <>
          <div className="matchup-player-cards">
            {side.bench.map((line) => (
              <MobilePlayer key={line.player_id} line={line} />
            ))}
          </div>
          <Table mt="xs" className="desktop-matchup-table">
            <Table.Tbody>
              {side.bench.map((line) => (
                <PlayerRow key={line.player_id} line={line} />
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}
    </section>
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
        <Button component={Link} to={`/lineup?week=${weekValue}`} variant="subtle" size="xs">
          Edit lineup for this week
        </Button>
      </Group>
      {error && <Alert color="red" mb="md">{error}</Alert>}
      {notFound && (
        <Alert color="gray" mb="md">No matchup found for this week (bye week, or the season hasn't reached it yet).</Alert>
      )}
      {query.isPending && validWeek && <MatchupColumnsSkeleton />}
      {matchup && (
        <div className="matchup-columns" aria-busy={query.isPlaceholderData || undefined}>
          <TeamCard side={matchup.our_team} label="Your team" />
          <TeamCard side={matchup.opponent} label="Opponent" />
        </div>
      )}
    </div>
  )
}

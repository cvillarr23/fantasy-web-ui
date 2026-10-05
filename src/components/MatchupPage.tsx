import { ScoreValue } from './ScoreValue'
import { useEffect, useState } from 'react'
import { Alert, Button, Group, Stack, Table, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { ApiError, getMatchup } from '../api/client'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { DeficitBadge, SwapBadge } from './DeficitBadge'
import { PlayerCard } from './PlayerCard'
import { WeekSelector } from './WeekSelector'
import type { MatchupResponse, MatchupTeamSide, PlayerLine } from '../api/types'

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
            <Table.Th>Slot</Table.Th>
            <Table.Th></Table.Th>
            <Table.Th>Player</Table.Th>
            <Table.Th>Pos</Table.Th>
            <Table.Th>#</Table.Th>
            <Table.Th>Fantasy points</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {side.starters.map((line) => (
            <PlayerRow key={line.player_id} line={line} />
          ))}
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
  const [matchup, setMatchup] = useState<MatchupResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const weekValue = Number(week)
  const validWeek = Number.isFinite(weekValue) && weekValue > 0

  useEffect(() => {
    if (!isConfigured || !validWeek) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setNotFound(false)
    // Clear stale content immediately so a week change never looks like a no-op while the
    // new request is in flight, or if it fails with a non-404 error.
    setMatchup(null)
    getMatchup(config.season, weekValue)
      .then((response) => {
        if (!cancelled) setMatchup(response)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
        } else {
          setError(String(err))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isConfigured, config.season, weekValue, validWeek])

  if (!isConfigured) {
    if (configLoading) return null
    return (
      <div className="dashboard">
        <Stack gap="md" mt="xl" align="center">
          <Text ta="center" maw={480}>
            No league configured yet. Set your league and team in Settings first.
          </Text>
          <Button component={Link} to="/settings" variant="default">
            Go to Settings
          </Button>
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
      {error && (
        <Alert color="red" mb="md">
          {error}
        </Alert>
      )}
      {notFound && (
        <Alert color="gray" mb="md">
          No matchup found for this week (bye week, or the season hasn't reached it yet).
        </Alert>
      )}
      {loading && <Text c="dimmed">Loading matchup…</Text>}
      {matchup && (
        <div className="matchup-columns">
          <TeamCard side={matchup.our_team} label="Your team" />
          <TeamCard side={matchup.opponent} label="Opponent" />
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Alert, Badge, Button, NumberInput, Stack, Table, Text, Tooltip } from '@mantine/core'
import { Link } from 'react-router-dom'
import { ApiError, getMatchup } from '../api/client'
import { useCurrentWeek } from '../hooks/useCurrentWeek'
import { loadStoredConfig } from '../hooks/useDraftConfig'
import { PlayerAvatar } from './PlayerAvatar'
import type { MatchupResponse, MatchupTeamSide, PlayerLine } from '../api/types'

function PlayerRow({ line }: { line: PlayerLine }) {
  return (
    <Table.Tr>
      <Table.Td>{line.slot}</Table.Td>
      <Table.Td><PlayerAvatar name={line.name} headshotUrl={line.headshot_url} /></Table.Td>
      <Table.Td>
        {line.name}
        {line.deficit_flag && (
          <Tooltip label="This position is a structural deficit on your roster">
            <Badge color="yellow" size="xs" ml={6}>thin</Badge>
          </Tooltip>
        )}
        {line.suggested_swap && (
          <Tooltip label={`Optimizer would start ${line.suggested_swap.bench_for} instead`}>
            <Badge color="blue" size="xs" ml={6}>swap?</Badge>
          </Tooltip>
        )}
      </Table.Td>
      <Table.Td>{line.position}</Table.Td>
      <Table.Td>{line.jersey ?? '—'}</Table.Td>
      <Table.Td>{line.points.toFixed(1)} / {line.projected_points.toFixed(1)}</Table.Td>
    </Table.Tr>
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
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Slot</Table.Th>
            <Table.Th></Table.Th>
            <Table.Th>Player</Table.Th>
            <Table.Th>Pos</Table.Th>
            <Table.Th>#</Table.Th>
            <Table.Th>Pts / Proj</Table.Th>
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
        <Table mt="xs">
          <Table.Tbody>
            {side.bench.map((line) => <PlayerRow key={line.player_id} line={line} />)}
          </Table.Tbody>
        </Table>
      )}
    </section>
  )
}

export function MatchupPage() {
  const config = loadStoredConfig()
  const isConfigured = Boolean(config.league_id && config.team_id)

  const [week, setWeek] = useState<number | string>('')
  const [matchup, setMatchup] = useState<MatchupResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const currentWeek = useCurrentWeek()

  useEffect(() => {
    if (currentWeek !== null && week === '') setWeek(currentWeek)
  }, [currentWeek])

  const weekValue = Number(week)
  const validWeek = Number.isFinite(weekValue) && weekValue > 0

  useEffect(() => {
    if (!isConfigured || !validWeek) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setNotFound(false)
    getMatchup(config.season, weekValue)
      .then((response) => { if (!cancelled) setMatchup(response) })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true)
          setMatchup(null)
        } else {
          setError(String(err))
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isConfigured, config.season, weekValue, validWeek])

  if (!isConfigured) {
    return (
      <div className="dashboard">
        <Stack gap="md" mt="xl" align="center">
          <Text ta="center" maw={480}>
            No league configured yet. Set up your league and team on the Draft Day page first.
          </Text>
          <Button component={Link} to="/draft" variant="default">Go to Draft Day</Button>
        </Stack>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <NumberInput
        label="Week"
        placeholder="e.g. 3"
        value={week}
        onChange={setWeek}
        allowDecimal={false}
        maw={160}
        mb="md"
      />
      {error && <Alert color="red" mb="md">{error}</Alert>}
      {notFound && (
        <Alert color="gray" mb="md">No matchup found for this week (bye week, or the season hasn't reached it yet).</Alert>
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

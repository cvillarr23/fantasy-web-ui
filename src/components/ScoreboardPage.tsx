import { useEffect, useState } from 'react'
import { Alert, Button, Group, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { getScoreboard } from '../api/client'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { WeekSelector } from './WeekSelector'
import type { ScoreboardMatchup, ScoreboardTeamInfo } from '../api/types'

function ScoreboardSide({ side, isMyTeam }: { side: ScoreboardTeamInfo | null; isMyTeam: boolean }) {
  if (!side) {
    return (
      <div className="scoreboard-side scoreboard-side-bye">
        <span className="matchup-team-label">BYE</span>
      </div>
    )
  }
  return (
    <div className={isMyTeam ? 'scoreboard-side my-team-row' : 'scoreboard-side'}>
      <img src={side.logo_url} alt="" width={28} height={28} className="matchup-team-logo" />
      <span className="scoreboard-team-name">{side.name}</span>
      <div className="matchup-team-score">
        <div className="matchup-score-actual">{side.score.toFixed(1)}</div>
        <div className="matchup-score-projected">proj {side.projected.toFixed(1)}</div>
      </div>
    </div>
  )
}

function ScoreboardCard({ matchup, myTeamId }: { matchup: ScoreboardMatchup; myTeamId: string }) {
  return (
    <section className="scoreboard-matchup-card">
      <ScoreboardSide side={matchup.home} isMyTeam={matchup.home?.team_id === myTeamId} />
      <ScoreboardSide side={matchup.away} isMyTeam={matchup.away?.team_id === myTeamId} />
    </section>
  )
}

export function ScoreboardPage() {
  const { config, loading: configLoading } = useDraftConfig()
  const isConfigured = Boolean(config.league_id && config.team_id)

  const [week, setWeek] = useSelectedWeek()
  const [matchups, setMatchups] = useState<ScoreboardMatchup[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weekValue = Number(week)
  const validWeek = Number.isFinite(weekValue) && weekValue > 0

  useEffect(() => {
    if (!isConfigured || !validWeek) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setMatchups(null)
    getScoreboard(config.season, weekValue)
      .then((response) => { if (!cancelled) setMatchups(response.matchups) })
      .catch((err) => { if (!cancelled) setError(String(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isConfigured, config.season, weekValue, validWeek])

  if (!isConfigured) {
    if (configLoading) return null
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
      </Group>
      {error && <Alert color="red" mb="md">{error}</Alert>}
      {loading && <Text c="dimmed">Loading scoreboard…</Text>}
      {matchups && matchups.length === 0 && (
        <Alert color="gray">No matchups this week.</Alert>
      )}
      {matchups && matchups.length > 0 && (
        <div className="scoreboard-grid">
          {matchups.map((matchup, index) => (
            <ScoreboardCard key={index} matchup={matchup} myTeamId={config.team_id} />
          ))}
        </div>
      )}
    </div>
  )
}

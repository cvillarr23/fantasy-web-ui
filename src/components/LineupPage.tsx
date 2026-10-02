import { useEffect, useState } from 'react'
import { Alert, Button, Group, Stack, Text } from '@mantine/core'
import { Link, useSearchParams } from 'react-router-dom'
import { getMatchup, getRosterDeficits } from '../api/client'
import { useCurrentWeek } from '../hooks/useCurrentWeek'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { LineupEditor } from './LineupEditor'
import { RosterDeficitsGrid } from './RosterDeficitsGrid'
import { WeekSelector } from './WeekSelector'
import type { MatchupResponse, RosterDeficitsResponse } from '../api/types'

export function LineupPage() {
  const { config, loading: configLoading } = useDraftConfig()
  const isConfigured = Boolean(config.league_id && config.team_id)

  const [searchParams] = useSearchParams()
  const weekFromUrl = Number(searchParams.get('week'))
  // number | string: '' is the "not yet resolved" state before either the URL param or
  // useCurrentWeek() seeds a real value.
  const [week, setWeek] = useState<number | string>(
    Number.isFinite(weekFromUrl) && weekFromUrl > 0 ? weekFromUrl : '',
  )
  const [deficits, setDeficits] = useState<RosterDeficitsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [matchup, setMatchup] = useState<MatchupResponse | null>(null)
  const currentWeek = useCurrentWeek()

  // Seed the field once the current week resolves, but only while it's still untouched -
  // never overwrite a week the user already typed or arrived with via URL.
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
    setDeficits(null)
    getRosterDeficits(config.season, weekValue)
      .then((response) => { if (!cancelled) setDeficits(response) })
      .catch((err) => { if (!cancelled) setError(String(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isConfigured, config.season, weekValue, validWeek])

  // Best-effort matchup context banner - omitted entirely on a bye week (404) rather than
  // shown as an error, since lineup editing must keep working when there's no opponent.
  useEffect(() => {
    if (!isConfigured || !validWeek) return
    let cancelled = false
    setMatchup(null)
    getMatchup(config.season, weekValue)
      .then((response) => { if (!cancelled) setMatchup(response) })
      .catch(() => { /* no opponent this week (bye) or matchup unavailable - banner just stays hidden */ })
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
        {matchup && (
          <Button component={Link} to={`/matchup?week=${weekValue}`} variant="subtle" size="xs">
            View matchup vs {matchup.opponent.team.name}
          </Button>
        )}
      </Group>
      {error && <Alert color="red" mb="md">{error}</Alert>}
      {(loading || deficits) && (
        <RosterDeficitsGrid deficits={deficits} myTeamId={config.team_id} loading={loading} />
      )}
      <LineupEditor key={`${config.league_id}:${config.team_id}:${config.season}`} config={config} week={week} />
    </div>
  )
}

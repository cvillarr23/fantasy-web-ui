import { useEffect, useState } from 'react'
import { Alert, Button, NumberInput, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import { getRosterDeficits } from '../api/client'
import { loadStoredConfig } from '../hooks/useDraftConfig'
import { LineupSwapBuilder } from './LineupSwapBuilder'
import { RosterDeficitsGrid } from './RosterDeficitsGrid'
import type { RosterDeficitsResponse } from '../api/types'

export function LineupPage() {
  const config = loadStoredConfig()
  const isConfigured = Boolean(config.league_id && config.team_id)

  // number | string, same reasoning as ConfigScreen's season field: NumberInput passes
  // intermediate values ('' while clearing, a partial typed digit) that aren't a valid week
  // yet, and snapping those back mid-edit would fight the user's typing.
  const [week, setWeek] = useState<number | string>('')
  const [deficits, setDeficits] = useState<RosterDeficitsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weekValue = Number(week)
  const validWeek = Number.isFinite(weekValue) && weekValue > 0

  useEffect(() => {
    if (!isConfigured || !validWeek) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getRosterDeficits(config.season, weekValue)
      .then((response) => { if (!cancelled) setDeficits(response) })
      .catch((err) => { if (!cancelled) setError(String(err)) })
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
      {(loading || deficits) && (
        <RosterDeficitsGrid deficits={deficits} myTeamId={config.team_id} loading={loading} />
      )}
      <LineupSwapBuilder config={config} />
    </div>
  )
}

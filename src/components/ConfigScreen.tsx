import { useState } from 'react'
import { Alert, Button, NumberInput, Stack, TextInput } from '@mantine/core'
import { setDraftConfig, startDraftSync } from '../api/client'
import type { DraftConfig } from '../api/types'
import { PageHeader } from './ui/PageHeader'

interface Props {
  initial: DraftConfig
  onConfigured: (config: DraftConfig) => void
}

export function ConfigScreen({ initial, onConfigured }: Props) {
  const [leagueId, setLeagueId] = useState(initial.league_id)
  const [teamId, setTeamId] = useState(initial.team_id)
  // number | string, not just number: NumberInput's onChange passes intermediate values
  // (e.g. '' while clearing the field, or a partial typed digit) that don't parse to a
  // valid year yet. Coercing those back to the old season here would fight the user mid-edit
  // (typing a new year would keep snapping back to the previous one) - so the raw value is
  // kept as-is and only normalized to a number where it's actually used, in handleSubmit.
  const [season, setSeason] = useState<number | string>(initial.season)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const seasonValue = Number(season)
    // Reject rather than silently substituting the previously loaded season: this used to
    // fall back to `initial.season` on any invalid input, which could save/start a different
    // season than the one currently shown without telling the operator.
    if (!Number.isFinite(seasonValue) || seasonValue <= 0) {
      setError('Season must be a valid year.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const config: DraftConfig = {
        league_id: leagueId.trim(),
        team_id: teamId.trim(),
        season: seasonValue,
        mode: 'live',
      }
      await setDraftConfig(config)
      onConfigured(config)
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleStart() {
    setBusy(true)
    setError(null)
    try {
      await startDraftSync()
      setStarted(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="config-screen">
      <PageHeader title="Draft Day" level={1} subtitle="Set up the league to follow on draft day." />
      <form onSubmit={handleSubmit}>
        <Stack gap="sm" mb="md">
          <TextInput
            label="League ID"
            value={leagueId}
            onChange={(e) => setLeagueId(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Your team ID"
            value={teamId}
            onChange={(e) => setTeamId(e.currentTarget.value)}
            required
          />
          <NumberInput
            label="Season"
            value={season}
            onChange={setSeason}
            allowDecimal={false}
            required
          />
          <Button type="submit" loading={busy}>Save config &amp; continue to dashboard</Button>
        </Stack>
      </form>
      <Button variant="default" loading={busy} onClick={handleStart}>
        {started ? 'Draft-sync job started ✓' : 'Start draft-sync job'}
      </Button>
      {error && <Alert color="red" mt="md">{error}</Alert>}
    </div>
  )
}

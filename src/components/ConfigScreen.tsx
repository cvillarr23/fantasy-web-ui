import { useState } from 'react'
import { Alert, Button, NumberInput, Stack, TextInput } from '@mantine/core'
import { setDraftConfig, startDraftSync } from '../api/client'
import type { DraftConfig } from '../api/types'

interface Props {
  initial: DraftConfig
  onConfigured: (config: DraftConfig) => void
}

export function ConfigScreen({ initial, onConfigured }: Props) {
  const [leagueId, setLeagueId] = useState(initial.league_id)
  const [teamId, setTeamId] = useState(initial.team_id)
  const [season, setSeason] = useState(initial.season)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const config: DraftConfig = { league_id: leagueId.trim(), team_id: teamId.trim(), season, mode: 'live' }
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
      <h1>Draft day setup</h1>
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
            onChange={(value) => setSeason(typeof value === 'number' ? value : Number(value) || season)}
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

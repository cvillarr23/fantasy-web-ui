import { useState } from 'react'
import { Alert, Button, NumberInput, Stack, TextInput, Title } from '@mantine/core'
import type { DraftConfig } from '../api/types'
import { useDraftConfig } from '../hooks/useDraftConfig'

// League/team settings, saved server-side so they follow the operator across browsers/devices.
export function SettingsPage() {
  const { config, loading, saveConfig } = useDraftConfig()
  // Keyed on the config so the form re-seeds once the server copy arrives (it may differ from
  // this browser's cache) without a setState-in-effect.
  return <SettingsForm key={JSON.stringify(config)} config={config} loading={loading} saveConfig={saveConfig} />
}

function SettingsForm({ config, loading, saveConfig }: {
  config: DraftConfig
  loading: boolean
  saveConfig: (config: DraftConfig) => Promise<void>
}) {
  const [leagueId, setLeagueId] = useState(config.league_id)
  const [teamId, setTeamId] = useState(config.team_id)
  // number | string for the same reason as ConfigScreen: NumberInput emits '' mid-edit.
  const [season, setSeason] = useState<number | string>(config.season)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const seasonValue = Number(season)
    if (!Number.isFinite(seasonValue) || seasonValue <= 0) {
      setError('Season must be a valid year.')
      return
    }
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await saveConfig({ league_id: leagueId.trim(), team_id: teamId.trim(), season: seasonValue, mode: 'live' })
      setSaved(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="config-screen">
      <Title order={1}>Settings</Title>
      <form onSubmit={handleSubmit}>
        <Stack gap="sm" mt="md">
          <TextInput label="League ID" value={leagueId} onChange={(e) => { setLeagueId(e.currentTarget.value); setSaved(false) }} disabled={loading} required />
          <TextInput label="Your team ID" value={teamId} onChange={(e) => { setTeamId(e.currentTarget.value); setSaved(false) }} disabled={loading} required />
          <NumberInput label="Season" value={season} onChange={(v) => { setSeason(v); setSaved(false) }} allowDecimal={false} disabled={loading} required />
          <Button type="submit" loading={busy || loading}>Save</Button>
        </Stack>
      </form>
      {saved && <Alert color="green" mt="md">Saved. This league/team now applies on every device.</Alert>}
      {error && <Alert color="red" mt="md">{error}</Alert>}
    </div>
  )
}

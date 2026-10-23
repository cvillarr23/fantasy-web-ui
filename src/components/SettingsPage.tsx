import { useState } from 'react'
import { Alert, Button, NumberInput, Skeleton, Stack, TextInput } from '@mantine/core'
import { SkeletonRegion } from './skeletons'
import type { DraftConfig } from '../api/types'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { PageHeader } from './ui/PageHeader'

// League/team settings, saved server-side so they follow the operator across browsers/devices.
export function SettingsPage() {
  const { config, loading, saveConfig } = useDraftConfig()
  if (loading) return <SettingsFormSkeleton />
  // Keyed on the config so the form re-seeds once the server copy arrives (it may differ from
  // this browser's cache) without a setState-in-effect.
  return <SettingsForm key={JSON.stringify(config)} config={config} saveConfig={saveConfig} />
}

// Same stack as the form: three labelled inputs and the save button.
function SettingsFormSkeleton() {
  return (
    <div className="config-screen">
      <PageHeader title="Settings" level={1} />
      <SkeletonRegion label="Loading settings">
        <Stack gap="sm" mt="md">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i}>
              <Skeleton height={14} width={110} mb={6} />
              <Skeleton height={36} radius="sm" />
            </div>
          ))}
          <Skeleton height={36} width={80} radius="sm" />
        </Stack>
      </SkeletonRegion>
    </div>
  )
}

function SettingsForm({ config, saveConfig }: {
  config: DraftConfig
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
      <PageHeader title="Settings" level={1} />
      <form onSubmit={handleSubmit}>
        <Stack gap="sm" mt="md">
          <TextInput label="League ID" value={leagueId} onChange={(e) => { setLeagueId(e.currentTarget.value); setSaved(false) }} required />
          <TextInput label="Your team ID" value={teamId} onChange={(e) => { setTeamId(e.currentTarget.value); setSaved(false) }} required />
          <NumberInput label="Season" value={season} onChange={(v) => { setSeason(v); setSaved(false) }} allowDecimal={false} required />
          <Button type="submit" loading={busy}>Save</Button>
        </Stack>
      </form>
      {saved && <Alert color="green" mt="md">Saved. This league/team now applies on every device.</Alert>}
      {error && <Alert color="red" mt="md">{error}</Alert>}
    </div>
  )
}

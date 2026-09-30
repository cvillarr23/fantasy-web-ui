import { useEffect, useState } from 'react'
import { Alert, Button, Stack, Text } from '@mantine/core'
import { Link, useSearchParams } from 'react-router-dom'
import { getRosterDeficits, getWaiverRecommendations } from '../api/client'
import { useCurrentWeek } from '../hooks/useCurrentWeek'
import { loadStoredConfig } from '../hooks/useDraftConfig'
import { RoadmapBanner } from './RoadmapBanner'
import { RosterDeficitsGrid } from './RosterDeficitsGrid'
import { WaiverRecommendationPanel } from './WaiverRecommendationPanel'
import { WeekSelector } from './WeekSelector'
import type { RosterDeficitsResponse, WaiverRecommendation } from '../api/types'

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function WaiverPage() {
  const config = loadStoredConfig()
  const isConfigured = Boolean(config.league_id && config.team_id)

  const [searchParams] = useSearchParams()
  const weekFromUrl = Number(searchParams.get('week'))
  const [week, setWeek] = useState<number | string>(
    Number.isFinite(weekFromUrl) && weekFromUrl > 0 ? weekFromUrl : '',
  )
  const [deficits, setDeficits] = useState<RosterDeficitsResponse | null>(null)
  const [recommendations, setRecommendations] = useState<WaiverRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  // Tracked per call: one endpoint failing (e.g. recommendations' 503 when no pregame data
  // is usable) must not hide what the other one returned.
  const [deficitsError, setDeficitsError] = useState<string | null>(null)
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null)
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
    setDeficitsError(null)
    setRecommendationsError(null)
    setDeficits(null)
    setRecommendations([])
    Promise.allSettled([
      getRosterDeficits(config.season, weekValue),
      getWaiverRecommendations(config.season, weekValue),
    ])
      .then(([deficitsResult, waiverResult]) => {
        if (cancelled) return
        if (deficitsResult.status === 'fulfilled') setDeficits(deficitsResult.value)
        else setDeficitsError(errorMessage(deficitsResult.reason))
        if (waiverResult.status === 'fulfilled') setRecommendations(waiverResult.value.recommendations)
        else setRecommendationsError(errorMessage(waiverResult.reason))
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
      <RoadmapBanner
        title="Waiver Manager improvements are planned"
        issueUrl="https://github.com/cvillarr23/fantasy-web-ui/issues/77"
      />
      <WeekSelector week={week} onChange={setWeek} />
      {deficitsError && <Alert color="red" mb="md">{deficitsError}</Alert>}
      {(loading || deficits) && (
        <RosterDeficitsGrid deficits={deficits} myTeamId={config.team_id} loading={loading} />
      )}
      {recommendationsError ? (
        // Not the panel: its empty state ("No waiver upgrades this week.") would misread a
        // failed load as "nothing worth claiming".
        <Alert color="red" mb="md">{recommendationsError}</Alert>
      ) : (
        <WaiverRecommendationPanel recommendations={recommendations} config={config} />
      )}
    </div>
  )
}

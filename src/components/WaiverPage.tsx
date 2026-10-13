import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryClient } from '../api/queryClient'
import { Alert, Group } from '@mantine/core'
import { getWaiverRecommendations } from '../api/client'
import { rosterDeficitsQuery } from '../api/weekReads'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { RosterDeficitsGrid } from './RosterDeficitsGrid'
import { WaiverRecommendationPanel } from './WaiverRecommendationPanel'
import { FreeAgentBrowser } from './FreeAgentBrowser'
import { RosterQuickActions } from './RosterQuickActions'
import { WeekSelector } from './ui/WeekSelector'
import { PageSkeleton } from './skeletons'
import { LeagueNotConfigured } from './ui/LeagueNotConfigured'

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export function WaiverPage() {
  const { config, loading: configLoading } = useDraftConfig()
  const isConfigured = Boolean(config.league_id && config.team_id)

  const [week, setWeek] = useSelectedWeek()
  // The free-agent pool is only fetched once the manager opens the browser, or arrives from
  // a link to it (the lineup page's open bench spots).
  const linkedToBrowser = useLocation().hash === '#free-agents'
  const [browseOpen, setBrowseOpen] = useState(linkedToBrowser)
  const browseRef = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (linkedToBrowser) browseRef.current?.scrollIntoView?.({ block: 'start' })
  }, [linkedToBrowser, isConfigured])
  const weekValue = Number(week)
  const enabled = isConfigured && Number.isInteger(weekValue) && weekValue > 0
  const deficitsQuery = useQuery(
    { ...rosterDeficitsQuery(config, weekValue), refetchInterval: 60_000, placeholderData: keepPreviousData },
    queryClient,
  )
  const recommendationsQuery = useQuery(
    {
      queryKey: ['waiver-recommendations', config.league_id, config.season, weekValue],
      queryFn: () => getWaiverRecommendations(config.season, weekValue),
      enabled,
      refetchInterval: 60_000,
      placeholderData: keepPreviousData,
    },
    queryClient,
  )
  const deficits = deficitsQuery.data ?? null
  const recommendations = recommendationsQuery.data?.recommendations ?? []
  const loading = deficitsQuery.isLoading
  const deficitsError = deficitsQuery.error ? errorMessage(deficitsQuery.error) : null
  const recommendationsError = recommendationsQuery.error
    ? errorMessage(recommendationsQuery.error)
    : null

  if (!isConfigured) {
    if (configLoading) return <PageSkeleton />
    return <LeagueNotConfigured />
  }

  return (
    <div className="dashboard">
      <Group justify="space-between" mb="md">
        <WeekSelector week={week} onChange={setWeek} />
        <RosterQuickActions page="waivers" week={week} />
      </Group>
      {deficitsError && (
        <Alert color="red" mb="md">
          {deficitsError}
        </Alert>
      )}
      {recommendationsError ? (
        // Not the panel: its empty state ("No waiver upgrades this week.") would misread a
        // failed load as "nothing worth claiming".
        <Alert color="red" mb="md">
          {recommendationsError}
        </Alert>
      ) : (
        <WaiverRecommendationPanel
          recommendations={recommendations}
          openIrSlots={recommendationsQuery.data?.open_ir_slots}
          openRosterSlots={recommendationsQuery.data?.open_roster_slots}
          irMoves={recommendationsQuery.data?.ir_moves}
          config={config}
          loading={recommendationsQuery.isLoading}
          updating={recommendationsQuery.isPlaceholderData}
        />
      )}
      <details
        id="free-agents"
        ref={browseRef}
        className="secondary-panel"
        open={browseOpen}
        onToggle={(e) => setBrowseOpen(e.currentTarget.open)}
      >
        <summary>Browse free agents</summary>
        {browseOpen && (
          <FreeAgentBrowser
            config={config}
            week={weekValue}
            openRosterSlots={recommendationsQuery.data?.open_roster_slots ?? 0}
          />
        )}
      </details>
      <details className="secondary-panel">
        <summary>League position depth</summary>
        {(loading || deficits) && (
          <RosterDeficitsGrid
            deficits={deficits}
            myTeamId={config.team_id}
            loading={loading}
            updating={deficitsQuery.isPlaceholderData}
          />
        )}
      </details>
    </div>
  )
}

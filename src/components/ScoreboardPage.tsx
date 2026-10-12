import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryClient } from '../api/queryClient'
import { Alert, Group, Skeleton } from '@mantine/core'
import { scoreboardQuery } from '../api/weekReads'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { useDraftConfig } from '../hooks/useDraftConfig'
import { WeekSelector } from './ui/WeekSelector'
import { PageSkeleton, SkeletonRegion } from './skeletons'
import type { ScoreboardMatchup, ScoreboardTeamInfo } from '../api/types'
import { LeagueNotConfigured } from './ui/LeagueNotConfigured'

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

// Same side rows as ScoreboardCard (logo, name, score over projection) so cards keep their size.
function ScoreboardGridSkeleton() {
  return (
    <SkeletonRegion label="Loading scoreboard" className="scoreboard-grid">
      {Array.from({ length: 6 }, (_, card) => (
        <section key={card} className="scoreboard-matchup-card">
          {[0, 1].map((side) => (
            <div key={side} className="scoreboard-side">
              <Skeleton height={28} width={28} radius={6} />
              <Skeleton height={16} width="45%" />
              <div className="matchup-team-score">
                <div className="matchup-score-actual"><Skeleton height={28} width={60} /></div>
                <div className="matchup-score-projected"><Skeleton height={16} width={60} mt={4} /></div>
              </div>
            </div>
          ))}
        </section>
      ))}
    </SkeletonRegion>
  )
}

export function ScoreboardPage() {
  const { config, loading: configLoading } = useDraftConfig()
  const isConfigured = Boolean(config.league_id && config.team_id)

  const [week, setWeek] = useSelectedWeek()
  const weekValue = Number(week)
  const validWeek = Number.isFinite(weekValue) && weekValue > 0

  // Previous week's cards stay up (dimmed via aria-busy) while the next week loads.
  const query = useQuery({ ...scoreboardQuery(config, weekValue), placeholderData: keepPreviousData }, queryClient)
  const matchups = query.data?.matchups ?? null
  const error = query.error ? String(query.error) : null

  if (!isConfigured) {
    if (configLoading) return <PageSkeleton />
    return <LeagueNotConfigured />
  }

  return (
    <div className="dashboard">
      <Group justify="space-between" align="center" mb="md">
        <WeekSelector week={week} onChange={setWeek} />
      </Group>
      {error && <Alert color="red" mb="md">{error}</Alert>}
      {query.isPending && validWeek && <ScoreboardGridSkeleton />}
      {matchups && matchups.length === 0 && (
        <Alert color="gray">No matchups this week.</Alert>
      )}
      {matchups && matchups.length > 0 && (
        <div className="scoreboard-grid" aria-busy={query.isPlaceholderData || undefined}>
          {matchups.map((matchup, index) => (
            <ScoreboardCard key={index} matchup={matchup} myTeamId={config.team_id} />
          ))}
        </div>
      )}
    </div>
  )
}

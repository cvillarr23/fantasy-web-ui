import { useQuery } from '@tanstack/react-query'
import { Anchor, Text } from '@mantine/core'
import { Link, useSearchParams } from 'react-router-dom'
import { queryClient } from '../../api/queryClient'
import { scoringRulesQuery } from '../../api/scoringReads'
import { useDraftConfig } from '../../hooks/useDraftConfig'
import { weekSearch } from '../../hooks/useSelectedWeek'
import { SkeletonRegion, TextSkeleton } from '../skeletons'
import { EmptyState } from '../ui/EmptyState'
import { ErrorAlert } from '../ui/ErrorAlert'
import { PageHeader } from '../ui/PageHeader'
import { ScoringRulesTable } from './ScoringRulesTable'
import { WorkedExample } from './WorkedExample'

export function ScoringGuidePage() {
  const { config } = useDraftConfig()
  const [params] = useSearchParams()
  const query = useQuery(scoringRulesQuery(config.season), queryClient)
  return (
    <div className="dashboard">
      <Anchor component={Link} to={`/matchup${weekSearch(params)}`} size="sm">← Matchup</Anchor>
      <PageHeader title="How fantasy points are scored" level={1} />
      <Text className="scoring-intro" data-testid="scoring-intro" mb="md">
        Your league turns real stats into points with a fixed rulebook. Every yard, catch and touchdown is worth a
        set amount, and some mistakes cost points. Your matchup score is the sum of your <strong>starters</strong> only.
      </Text>
      <div className="scoring-columns">
        <section className="scoring-box" aria-labelledby="scoring-rules-title">
          <h2 id="scoring-rules-title">Your league's rules</h2>
          {query.error && (
            <ErrorAlert onRetry={() => void query.refetch()}>Could not load the scoring rules. {String(query.error)}</ErrorAlert>
          )}
          {query.isPending && <SkeletonRegion label="Loading scoring rules"><TextSkeleton lines={8} /></SkeletonRegion>}
          {query.data === null && <EmptyState>No scoring settings synced for the {config.season} season.</EmptyState>}
          {query.data && <ScoringRulesTable rules={query.data.rules} />}
        </section>
        <section className="scoring-box" aria-labelledby="scoring-example-title">
          <h2 id="scoring-example-title">Worked example</h2>
          <WorkedExample rules={query.data?.rules ?? []} />
        </section>
      </div>
    </div>
  )
}

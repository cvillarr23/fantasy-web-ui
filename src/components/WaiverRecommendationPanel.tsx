import { Badge, Text } from '@mantine/core'
import { InjuryBadge } from './InjuryBadge'
import { RumorBadge } from './RumorBadge'
import type { WaiverRecommendation } from '../api/types'

interface Props {
  recommendations: WaiverRecommendation[]
}

export function WaiverRecommendationPanel({ recommendations }: Props) {
  return (
    <section className="waiver-recommendation-panel">
      <h3>Waiver pickups</h3>
      {recommendations.length === 0 ? (
        <Text c="dimmed" size="sm">No waiver upgrades this week.</Text>
      ) : (
        <ul className="waiver-recommendation-list">
          {recommendations.map(({ position, vorp_delta, free_agent, bench_player, rumor_sentiment, rumor_confidence, rumor_suggested_action }) => (
            <li key={`${position}-${free_agent.espn_id ?? free_agent.name}`} className="waiver-recommendation-row">
              <span className="waiver-recommendation-players">
                <span>
                  {free_agent.name} ({position})
                  <InjuryBadge status={free_agent.injury_status} />
                  <RumorBadge
                    sentiment={rumor_sentiment}
                    confidence={rumor_confidence}
                    suggestedAction={rumor_suggested_action}
                  />
                </span>
                <span aria-hidden="true"> → </span>
                <span>
                  {bench_player.name}
                  <InjuryBadge status={bench_player.injury_status} />
                </span>
              </span>
              <Badge color={vorp_delta > 0 ? 'green' : 'gray'} size="sm">
                VORP {vorp_delta >= 0 ? '+' : ''}{vorp_delta.toFixed(1)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

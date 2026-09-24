import { Badge, Button, Text } from '@mantine/core'
import { InjuryBadge } from './InjuryBadge'
import { PlayerCard } from './PlayerCard'
import { RumorBadge } from './RumorBadge'
import type { LineupPlayerLine, LineupRosterResponse } from '../api/types'

interface Suggestion {
  starter: LineupPlayerLine
  benchPlayer: LineupPlayerLine
  vorpDelta: number
}

interface Props {
  roster: LineupRosterResponse
  onApply: (starter: LineupPlayerLine, benchPlayer: LineupPlayerLine) => void
}

function buildSuggestions(roster: LineupRosterResponse): Suggestion[] {
  const suggestions: Suggestion[] = []
  for (const starter of roster.starters) {
    if (!starter.suggested_swap) continue
    const benchPlayer = roster.bench.find((p) => p.player_id === starter.suggested_swap!.add_player_id)
    if (!benchPlayer) continue
    suggestions.push({
      starter,
      benchPlayer,
      vorpDelta: (benchPlayer.net_vorp ?? 0) - (starter.net_vorp ?? 0),
    })
  }
  return suggestions.sort((a, b) => b.vorpDelta - a.vorpDelta)
}

export function LineupSuggestionPanel({ roster, onApply }: Props) {
  const suggestions = buildSuggestions(roster)

  return (
    <section className="lineup-suggestion-panel">
      <h3>Suggested start/sit changes</h3>
      {suggestions.length === 0 ? (
        <Text c="dimmed" size="sm">No suggested changes this week.</Text>
      ) : (
        <ul className="lineup-suggestion-list">
          {suggestions.map(({ starter, benchPlayer, vorpDelta }) => (
            <li key={starter.player_id} className="lineup-suggestion-row">
              <span className="lineup-suggestion-players">
                <PlayerCard
                  variant="row"
                  player={{ id: starter.player_id, name: starter.name }}
                  meta={`(${starter.slot})`}
                  badges={
                    <>
                      <InjuryBadge status={starter.injury_status} />
                      <RumorBadge
                        sentiment={starter.rumor_sentiment}
                        confidence={starter.rumor_confidence}
                        suggestedAction={starter.rumor_suggested_action}
                      />
                    </>
                  }
                />
                <span aria-hidden="true"> → </span>
                <PlayerCard
                  variant="row"
                  player={{ id: benchPlayer.player_id, name: benchPlayer.name }}
                  badges={
                    <>
                      <InjuryBadge status={benchPlayer.injury_status} />
                      <RumorBadge
                        sentiment={benchPlayer.rumor_sentiment}
                        confidence={benchPlayer.rumor_confidence}
                        suggestedAction={benchPlayer.rumor_suggested_action}
                      />
                    </>
                  }
                />
              </span>
              <Badge color={vorpDelta > 0 ? 'green' : 'gray'} size="sm">
                VORP {vorpDelta >= 0 ? '+' : ''}{vorpDelta.toFixed(1)}
              </Badge>
              <Button size="xs" variant="light" onClick={() => onApply(starter, benchPlayer)}>
                Apply
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

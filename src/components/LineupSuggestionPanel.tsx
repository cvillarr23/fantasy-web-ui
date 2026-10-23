import { Badge, Button, Text } from '@mantine/core'
import { PlayerCard } from './player/PlayerCard'
import { PlayerListSkeleton } from './skeletons'
import type { LineupPlayerLine, LineupRosterResponse } from '../api/types'
import { buildSuggestions } from './lineupSuggestions'
import { PlayerStatusBadges } from './player/PlayerStatusBadges'

interface Props {
  roster: LineupRosterResponse
  onApply: (starter: LineupPlayerLine, benchPlayer: LineupPlayerLine) => void
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
          {suggestions.map(({ starter, benchPlayer, vorpDelta, explanation }) => (
            <li key={starter.player_id} className="lineup-suggestion-row">
              <span className="lineup-suggestion-players">
                <PlayerCard
                  variant="row"
                  player={{ id: starter.player_id, name: starter.name }}
                  meta={`(${starter.slot})`}
                  badges={
                    <PlayerStatusBadges player={starter} />
                  }
                />
                <span aria-hidden="true"> → </span>
                <PlayerCard
                  variant="row"
                  player={{ id: benchPlayer.player_id, name: benchPlayer.name }}
                  badges={
                    <PlayerStatusBadges player={benchPlayer} />
                  }
                />
              </span>
              <Badge color={vorpDelta > 0 ? 'green' : 'gray'} size="sm">
                VORP {vorpDelta >= 0 ? '+' : ''}{vorpDelta.toFixed(1)}
              </Badge>
              <Button size="xs" variant="light" onClick={() => onApply(starter, benchPlayer)}>
                Apply
              </Button>
              {explanation && (
                <Text c="dimmed" size="xs" className="lineup-suggestion-explanation">
                  {explanation}
                </Text>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// Shown while the roster (which carries the optimizer's suggestions) is still loading.
export function LineupSuggestionPanelSkeleton() {
  return (
    <section className="lineup-suggestion-panel">
      <h3>Suggested start/sit changes</h3>
      <PlayerListSkeleton rows={2} variant="row" label="Loading suggestions" />
    </section>
  )
}

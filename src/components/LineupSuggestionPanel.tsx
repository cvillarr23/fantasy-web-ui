import { Badge, Button, Text } from '@mantine/core'
import { HEALTHY_STATUSES } from './player/InjuryBadge'
import { PlayerCard } from './player/PlayerCard'
import { PlayerListSkeleton } from './skeletons'
import type { LineupPlayerLine, LineupRosterResponse } from '../api/types'
import { PlayerStatusBadges } from './player/PlayerStatusBadges'

interface Suggestion {
  starter: LineupPlayerLine
  benchPlayer: LineupPlayerLine
  vorpDelta: number
  explanation?: string | null
}

interface Props {
  roster: LineupRosterResponse
  onApply: (starter: LineupPlayerLine, benchPlayer: LineupPlayerLine) => void
}

// Statuses that make sitting the starter close to mandatory, regardless of VORP delta.
const SEVERE_STATUSES = new Set(['OUT', 'INJURY_RESERVE', 'SUSPENSION', 'DOUBTFUL'])

function injurySeverity(status: string | null): number {
  if (!status || HEALTHY_STATUSES.has(status)) return 0
  if (SEVERE_STATUSES.has(status)) return 2
  return 1 // QUESTIONABLE, DAY_TO_DAY, or any other flagged-but-unrecognized status
}

function buildSuggestions(roster: LineupRosterResponse): Suggestion[] {
  const suggestions: Suggestion[] = []
  for (const starter of roster.starters) {
    if (!starter.suggested_swap) continue
    const benchPlayer = roster.bench.find((p) => p.player_id === starter.suggested_swap!.add_player_id && p.slot !== 'IR')
    if (!benchPlayer) continue
    suggestions.push({
      starter,
      benchPlayer,
      vorpDelta: (benchPlayer.net_vorp ?? 0) - (starter.net_vorp ?? 0),
      explanation: starter.suggested_swap.explanation,
    })
  }
  return suggestions.sort((a, b) => {
    const severityDiff = injurySeverity(b.starter.injury_status) - injurySeverity(a.starter.injury_status)
    return severityDiff !== 0 ? severityDiff : b.vorpDelta - a.vorpDelta
  })
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

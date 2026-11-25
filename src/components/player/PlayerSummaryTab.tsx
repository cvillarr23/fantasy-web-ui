import type { ReactNode } from 'react'
import { Alert, Anchor, SimpleGrid, Stack, Text } from '@mantine/core'
import type { PlayerSummary } from '../../api/types'
import { formatPoints } from './popoverFormat'

interface Props {
  summary: PlayerSummary
  /** Shown as "Open game details" only when given and the game has an id. */
  onOpenGame?: (eventId: string) => void
}

export function PlayerSummaryTab({ summary, onOpenGame }: Props) {
  const tiles = summaryTiles(summary)
  const eventId = summary.live?.event_id
  return (
    <Stack gap="sm">
      {summary.injury_status && (
        <Alert color="yellow" variant="light" title="Injury report">
          {summary.injury_status}
        </Alert>
      )}
      {tiles.length > 0 && (
        <SimpleGrid cols={2} spacing="xs" aria-label="Player summary">
          {tiles.map((tile) => <Tile key={tile.label} {...tile} />)}
        </SimpleGrid>
      )}
      {tiles.length === 0 && !summary.injury_status && (
        <Text c="dimmed" size="sm">No live details yet for this player.</Text>
      )}
      {onOpenGame && eventId && (
        <Anchor component="button" type="button" size="sm" onClick={() => onOpenGame(eventId)}>
          Open game details →
        </Anchor>
      )}
    </Stack>
  )
}

interface TileData {
  label: string
  value: string
  detail?: ReactNode
}

function Tile({ label, value, detail }: TileData) {
  return (
    <div className="popover-tile">
      <Text size="xs" tt="uppercase" c="dimmed">{label}</Text>
      <Text fw={600} className="num">{value}</Text>
      {detail && <Text size="xs" c="dimmed">{detail}</Text>}
    </div>
  )
}

/** The tiles core can fill in today: each is skipped, not shown as 0, when its data is absent. */
function summaryTiles(summary: PlayerSummary): TileData[] {
  const { live, season_avg, espn } = summary
  const tiles: TileData[] = []
  if (live) {
    tiles.push({ label: 'This week', value: formatPoints(live.live_points), detail: `Proj ${formatPoints(live.projected_points)}` })
    if (live.game_label) {
      tiles.push({ label: 'Game', value: live.game_label, detail: live.game_status ? GAME_STATUS[live.game_status] : undefined })
    }
  }
  if (season_avg != null) tiles.push({ label: 'Season avg', value: formatPoints(season_avg), detail: 'pts / game' })
  if (espn?.percent_owned != null) {
    tiles.push({
      label: 'ESPN rostered',
      value: `${formatPercent(espn.percent_owned)}%`,
      detail: espn.percent_started != null ? `Started ${formatPercent(espn.percent_started)}%` : undefined,
    })
  }
  return tiles
}

const GAME_STATUS = { not_started: 'Upcoming', in_progress: 'Live', final: 'Final' } as const

function formatPercent(value: number): string {
  return String(Math.round(value * 10) / 10)
}

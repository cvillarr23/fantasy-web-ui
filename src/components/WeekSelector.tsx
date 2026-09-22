import { ActionIcon, Group, Text } from '@mantine/core'

interface Props {
  week: number | string
  onChange: (week: number) => void
  min?: number
  max?: number
}

const DEFAULT_MIN = 1
const DEFAULT_MAX = 18

/** Prev/next week bar, sitting atop a weekly view (Matchup, Lineup). Replaces a plain
 * number box so the reader always sees "Week N" rather than an empty/editable field. */
export function WeekSelector({ week, onChange, min = DEFAULT_MIN, max = DEFAULT_MAX }: Props) {
  const current = Number(week)
  const hasValidWeek = Number.isFinite(current) && current > 0

  return (
    <Group gap="xs" className="week-selector">
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Previous week"
        disabled={!hasValidWeek || current <= min}
        onClick={() => onChange(current - 1)}
      >
        ‹
      </ActionIcon>
      <Text fw={600} miw={80} ta="center">
        {hasValidWeek ? `Week ${current}` : 'Week —'}
      </Text>
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Next week"
        disabled={!hasValidWeek || current >= max}
        onClick={() => onChange(current + 1)}
      >
        ›
      </ActionIcon>
    </Group>
  )
}

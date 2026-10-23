import { Badge, Group } from '@mantine/core'
import { InfoTip } from './ui/InfoTip'
import { lineupGlossary } from './lineupGlossary'
import type { PositionShortfall } from './lineupSummary'

/** A count that is still loading (undefined), failed (null), or known. */
type Loadable<T> = T | null | undefined

interface Props {
  suggestedChanges: Loadable<number>
  injuredStarters: Loadable<number>
  byeCrunchWeeks: Loadable<number[]>
  shortfalls: Loadable<PositionShortfall[]>
  /** Called with the section id when a pill that jumps to a section is clicked. */
  onNavigate?: (sectionId: string) => void
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Header pills that count what needs attention and link to the section that explains it. */
export function LineupSummaryPills({ suggestedChanges, injuredStarters, byeCrunchWeeks, shortfalls, onNavigate }: Props) {
  const jump = (id: string) => () => onNavigate?.(id)
  return (
    <Group gap="sm" aria-label="Lineup summary">
      <Badge component="a" href="#set-lineup" size="lg" variant="light" onClick={jump('set-lineup')}>
        {suggestedChanges === undefined ? '… suggested changes'
          : suggestedChanges === null ? 'Suggested changes unavailable'
          : plural(suggestedChanges, 'suggested change')}
      </Badge>
      <Badge component="a" href="#set-lineup" size="lg" variant="light" color={injuredStarters ? 'red' : 'gray'} onClick={jump('set-lineup')}>
        {injuredStarters === undefined ? '… injured starters'
          : injuredStarters === null ? 'Injured starters unavailable'
          : injuredStarters === 0 ? 'No injured starters'
          : plural(injuredStarters, 'injured starter')}
      </Badge>
      {byeCrunchWeeks?.length ? (
        <Badge component="a" href="#bye-crunch" size="lg" variant="light" color="yellow" onClick={jump('bye-crunch')}>
          Bye crunch: weeks {byeCrunchWeeks.join(', ')}
        </Badge>
      ) : (
        <Badge size="lg" variant="light" color={byeCrunchWeeks === null ? 'gray' : 'yellow'}>
          {byeCrunchWeeks === undefined ? '… bye outlook' : byeCrunchWeeks === null ? 'Bye outlook unavailable' : 'No bye crunch ahead'}
        </Badge>
      )}
      {shortfalls?.length ? (
        <Badge component="a" href="#deficits" size="lg" variant="light" color="red" onClick={jump('deficits')}>
          {plural(shortfalls.length, 'position')} short
        </Badge>
      ) : (
        <Badge size="lg" variant="light" color="gray">
          {shortfalls === undefined ? '… roster positions' : shortfalls === null ? 'Roster positions unavailable' : 'All positions covered'}
        </Badge>
      )}
      <InfoTip label="a bye crunch">{lineupGlossary.byeCrunch}</InfoTip>
    </Group>
  )
}

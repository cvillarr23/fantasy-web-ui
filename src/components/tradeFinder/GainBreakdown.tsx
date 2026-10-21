import { useEffect, useId, useRef, useState } from 'react'
import { Popover, Text } from '@mantine/core'
import { lineupChanges, scoreTone } from './tradeFinderFormat'
import { signedScore } from '../tradeScore/tradeScoreFormat'
import { ErrorAlert } from '../ui/ErrorAlert'
import { useCandidateScore, type CandidateEvidenceProps } from './useCandidateScore'


export function GainBreakdown({ side, ...props }: CandidateEvidenceProps & { side: 'us' | 'counterparty' }) {
  const [opened, setOpened] = useState(false)
  const id = useId()
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const open = () => { clearTimeout(timer.current); setOpened(true) }
  const closeSoon = () => { timer.current = setTimeout(() => setOpened(false), 150) }
  const score = useCandidateScore(props, opened)
  const value = side === 'us' ? props.candidate.our_lineup_gain : props.candidate.counterparty_lineup_change
  const liveValue = score.data?.roster_impact[side].total_delta
  return <Popover opened={opened} onChange={setOpened} width={330} position="bottom-start" withinPortal shadow="md" withRoles={false}>
    <Popover.Target>
      <button type="button" className={`finder-gain ${scoreTone(value)}`} aria-label={side === 'us' ? 'Where our gain comes from' : 'Where their change comes from'} aria-expanded={opened} aria-describedby={opened ? id : undefined}
        onMouseEnter={open} onMouseLeave={closeSoon} onFocus={open} onBlur={closeSoon} onClick={() => { clearTimeout(timer.current); setOpened(true) }}>
        {signedScore(value)}
      </button>
    </Popover.Target>
    <Popover.Dropdown id={id} role="tooltip" className="info-tip-popover" onMouseEnter={open} onMouseLeave={closeSoon}>
      <strong>{side === 'us' ? 'Where our' : `${props.candidate.counterparty.name}: where`} {signedScore(liveValue)} comes from</strong>
      <Text size="xs" c="dimmed">Live score · snapshot value {signedScore(value)}</Text>
      {score.isLoading && <Text size="sm">Loading weekly lineup changes…</Text>}
      {score.error && <ErrorAlert onRetry={() => void score.refetch()}>{score.error.message}</ErrorAlert>}
      {score.data && props.candidate.horizon_weeks.map((week) => {
        const evidence = score.data.roster_impact[side].weeks.find((w) => w.week === week)
        const changes = evidence && lineupChanges(evidence)
        return <div className="finder-gain-week" key={week}>
          <span>Wk {week}</span><span className={scoreTone(evidence?.delta ?? null)}>{signedScore(evidence?.delta)}</span>
          <span>{changes ? [...changes.entering.map((p) => `${p.name || p.espn_id} enters`), ...changes.leaving.map((p) => `${p.name || p.espn_id} leaves`)].join('; ') || 'Same starters' : 'Not scored'}</span>
        </div>
      })}
      <Text size="xs" mt="xs">{side === 'us' ? 'Change in our best starting lineup (VORP) each week. The schedule boost is applied on top.' : 'Change in their best starting lineup (VORP) each week.'}</Text>
    </Popover.Dropdown>
  </Popover>
}

import { useState } from 'react'
import { Button, Group, NativeSelect, Stack, Text } from '@mantine/core'
import { Link } from 'react-router-dom'
import type { LeagueTradeContext, RosterDeficitsResponse } from '../../api/types'
import type { TradeScoreLineupWeek } from '../../api/tradeScoreTypes'
import { StatTile } from '../ui/StatTile'
import { StrengthChip } from '../ui/StrengthChip'
import { ErrorAlert } from '../ui/ErrorAlert'
import { signedScore } from '../tradeScore/tradeScoreFormat'
import { tradeGlossary, tradeGlossaryForWeights } from '../tradeScore/tradeGlossary'
import { TradeScoreBreakdown } from '../tradeScore/TradeScoreBreakdown'
import { lineupChanges, scoreTone } from './tradeFinderFormat'
import { headToHeadWeeks, teamNeeds } from './tradeFinderFormat'
import { useCandidateScore, type CandidateEvidenceProps } from './useCandidateScore'

function LineupWeek({ week, side }: { week: TradeScoreLineupWeek; side: string }) {
  const changes = lineupChanges(week)
  return <div className="finder-lineup-week">
    <small>{side} · Wk {week.week} <strong className={scoreTone(week.delta)}>{signedScore(week.delta)}</strong></small>
    {changes.leaving.length || changes.entering.length ? <div>
      <div>{changes.leaving.map((p) => <span key={p.espn_id} className="finder-leaving">{p.position} · {p.name || p.espn_id} </span>)}</div>
      <span aria-hidden="true">→ </span>
      {changes.entering.map((p) => <span key={p.espn_id} className="finder-positive">{p.position} · {p.name || p.espn_id} </span>)}
      {!changes.entering.length && <span>No replacement starter</span>}
    </div> : <Text size="xs">Same starters</Text>}
  </div>
}
export function TradeCandidateDetails({ context, deficits, onOpenBuilder, ...props }: CandidateEvidenceProps & {
  context?: LeagueTradeContext; deficits?: RosterDeficitsResponse; onOpenBuilder?: () => void
}) {
  const [fullLineup, setFullLineup] = useState(false)
  const [lineupWeek, setLineupWeek] = useState(props.week)
  const [breakdown, setBreakdown] = useState(false)
  const score = useCandidateScore(props, true)
  const { candidate: c } = props
  const team = context?.teams[c.counterparty.team_id]
  const h2h = headToHeadWeeks(context, c.counterparty.team_id, props.config.team_id)
  const review = new URLSearchParams([['kind', 'trade'], ['week', String(props.week)], ...c.receive.map((p) => ['add', p.espn_id]), ...c.send.map((p) => ['drop', p.espn_id])])
  return <aside aria-label="Selected trade details" className="finder-details">
    <small>SELECTED TRADE</small><h3>{c.counterparty.name}</h3>
    <div className="finder-badges"><StrengthChip value={team?.strength.z_score} info /><span>{team?.strength.points_per_week == null ? 'Points/week unknown' : `${team.strength.points_per_week.toFixed(1)} pts/week`}</span>{h2h.length > 0 && <span className="finder-h2h">You play them wk {h2h.join(', ')}</span>}</div>
    <Text size="sm">{teamNeeds(deficits, c.counterparty.team_id)}</Text>
    <Text size="xs" c="dimmed">Snapshot scores · {c.scored_weeks.length} of {c.horizon_weeks.length} weeks scored</Text>
    <div className="finder-mini-tiles">
      <StatTile label="Our gain" value={c.our_lineup_gain} info={tradeGlossary.ourLineupGain} />
      <StatTile label="Theirs" value={c.counterparty_lineup_change} info={tradeGlossary.theirChange} />
      <StatTile label="Final" value={c.final_score} info={tradeGlossaryForWeights(undefined).finalScore} />
    </div>
    <h4>Starting lineup changes</h4>
    <Text size="xs" c="dimmed">Live score from current rosters; may differ from the computed snapshot.</Text>
    {score.isLoading && <Text size="sm" role="status">Loading lineup changes…</Text>}
    {score.error && <ErrorAlert onRetry={() => void score.refetch()}>{score.error.message}</ErrorAlert>}
    {score.data && <>
      <NativeSelect label="Lineup week" value={lineupWeek} data={c.horizon_weeks.map((week) => ({ value: String(week), label: `Week ${week}` }))} onChange={(event) => setLineupWeek(Number(event.currentTarget.value))} />
      <Stack gap="xs">{(['us', 'counterparty'] as const).map((side) => {
        const evidence = score.data.roster_impact[side].weeks.find((week) => week.week === lineupWeek)
        return evidence ? <LineupWeek key={side} week={evidence} side={side === 'us' ? 'Us' : 'Them'} /> : <Text key={side} size="sm">{side === 'us' ? 'Our' : 'Their'} lineup could not be scored for week {lineupWeek}.</Text>
      })}</Stack>
      <Button variant="subtle" size="xs" aria-expanded={fullLineup} onClick={() => setFullLineup(!fullLineup)}>{fullLineup ? 'Hide their full lineup' : 'Show their full lineup'}</Button>
      {fullLineup && score.data.roster_impact.counterparty.weeks.filter((week) => week.week === lineupWeek).map((week) => {
        const outgoing = c.receive
        const incomingIds = new Set(c.send.map((p) => p.espn_id))
        return <div key={week.week} className="finder-full-lineup"><strong>Their starters after the trade · Wk {week.week}</strong>
          {week.starters_after.map((p) => <div key={p.espn_id} className={incomingIds.has(p.espn_id) ? 'finder-positive' : ''}>{p.position} · {p.name || p.espn_id} {incomingIds.has(p.espn_id) && '(incoming)'} <span>{p.vorp_score.toFixed(1)}</span></div>)}
          {outgoing.map((p) => <div key={p.espn_id} className="finder-leaving">{p.position} · {p.name || p.espn_id} (outgoing)</div>)}
        </div>
      })}
    </>}
    <Group gap="xs">
      <Button onClick={onOpenBuilder} disabled={!onOpenBuilder}>Open in builder</Button>
      <Button variant="default" onClick={() => setBreakdown(!breakdown)} aria-expanded={breakdown}>Full breakdown</Button>
      <Button component={Link} to={`/moves/review?${review}`} variant="subtle">Review roster impact</Button>
    </Group>
    {breakdown && score.data && <TradeScoreBreakdown score={score.data} />}
  </aside>
}

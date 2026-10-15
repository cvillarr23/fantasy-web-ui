import { Badge, Group, List, Stack, Table, Text } from '@mantine/core'
import type { TradeScore, TradeScoreByeCoverage, TradeScoreLineupWeek, TradeScoreScheduleWeek } from '../../api/types'
import { formatFantasyStrength } from '../tradeContextFormat'
import { TradeContextProvenance } from '../TradeContextProvenance'
import { reasonLabel } from './tradeScoreReasons'
import { lineupMoves, signedScore } from './tradeScoreFormat'

// Presentation only: every number below is a field core returned. Nothing is summed or
// weighted here, so this page can never disagree with the scorer it explains.

function ReasonList({ codes }: { codes: string[] }) {
  return (
    <List size="sm">
      {codes.map((code) => {
        const reason = reasonLabel(code)
        return <List.Item key={code}>{reason.label}: {reason.detail}</List.Item>
      })}
    </List>
  )
}

// Core's raw VORP sums each side as if an uncounted player were worth 0: unmapped players are
// dropped and players without a row for the week add nothing. A side with nobody counted is
// therefore unknown, and a side missing only some players is a lower bound.
function rawVorpCells(score: TradeScore) {
  const { raw_vorp: raw } = score
  const missing = new Set(raw.missing_player_ids)
  const side = (players: TradeScore['send'], total: number) => {
    const uncounted = players.filter((p) => !p.player_id || missing.has(p.player_id)).length
    if (players.length > 0 && uncounted === players.length) return { known: false, partial: false, text: 'Not available' }
    return { known: true, partial: uncounted > 0, text: uncounted ? `${total.toFixed(1)} (incomplete)` : total.toFixed(1) }
  }
  const received = side(score.receive, raw.incoming_total)
  const sent = side(score.send, raw.outgoing_total)
  const net = !received.known || !sent.known ? 'Not available'
    : received.partial || sent.partial ? `${signedScore(raw.delta_vorp)} (incomplete)` : signedScore(raw.delta_vorp)
  return { received: received.text, sent: sent.text, net }
}

function weight(value: number | null): string {
  return value == null ? 'Unknown' : `×${value.toFixed(2)}`
}

function TermRow({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Table.Tr aria-label={label}>
      <Table.Th scope="row">{label}</Table.Th>
      <Table.Td>{value}</Table.Td>
      <Table.Td><Text size="xs" c="dimmed">{detail}</Text></Table.Td>
    </Table.Tr>
  )
}

export function TradeScoreBreakdown({ score, teamNames }: {
  score: TradeScore
  teamNames?: Record<string, string>
}) {
  const { horizon, score: terms, raw_vorp: raw, roster_impact: impact, weights } = score
  const ours = teamNames?.[score.our_team.team_id] || score.our_team.name
  const theirs = teamNames?.[score.counterparty_team.team_id] || score.counterparty_team.name
  const teamName = (id: string | null) => (id && teamNames?.[id])
    || (id === score.our_team.team_id ? ours : id === score.counterparty_team.team_id ? theirs : `Team ${id}`)
  const playerNames = new Map<string, string>()
  for (const player of [...score.send, ...score.receive]) if (player.name) playerNames.set(player.espn_id, player.name)
  for (const side of [impact.us, impact.counterparty]) {
    for (const w of side.weeks) {
      for (const s of [...w.starters_before, ...w.starters_after]) if (s.name) playerNames.set(s.espn_id, s.name)
    }
  }
  const playerName = (espnId: string) => playerNames.get(espnId) || `ESPN player ${espnId}`
  const scoredCount = horizon.scored_weeks.length
  const totalWeeks = horizon.end_week - horizon.start_week + 1
  const rawCells = rawVorpCells(score)

  return (
    <Stack gap="md" aria-label="Trade score breakdown" component="section">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text size="sm" c="dimmed">Final score</Text>
          <Text size="xl" fw={700}>{terms.final_score == null ? 'Score unavailable' : signedScore(terms.final_score)}</Text>
          {terms.final_score == null && <ReasonList codes={terms.final_score_unavailable_reasons} />}
        </div>
        <Group gap="xs">
          <Badge variant="light">{`Weeks ${horizon.start_week}–${horizon.end_week} · ${scoredCount} of ${totalWeeks} scored`}</Badge>
          {!horizon.complete_horizon && <Badge color="yellow">Partial horizon</Badge>}
          <Text size="xs" c="dimmed">{score.scoring_version}</Text>
        </Group>
      </Group>
      {!horizon.complete_horizon && (
        <Text size="sm">
          {scoredCount ? `Totals cover weeks ${horizon.scored_weeks.join(', ')} only.` : 'No week in the horizon was scored.'}
        </Text>
      )}

      <Table.ScrollContainer minWidth={420}>
        <Table aria-label="Score terms">
          <Table.Tbody>
            <TermRow label={`Raw VORP received (week ${raw.week})`} value={rawCells.received}
              detail="Single-week VORP of the players you receive, from the same data as Compare VORP; players without data are flagged here instead of counted as 0." />
            <TermRow label={`Raw VORP sent (week ${raw.week})`} value={rawCells.sent}
              detail="Single-week VORP of the players you send." />
            <TermRow label={`Raw VORP net (week ${raw.week})`} value={rawCells.net}
              detail={`Received minus sent, week ${raw.week} only; it ignores lineups and schedule.`} />
            <TermRow label="Our lineup gain (G)" value={signedScore(terms.our_lineup_gain)}
              detail={`Change in ${ours}'s best starting-lineup VORP, summed over scored weeks.`} />
            <TermRow label="Our weighted gain (G*)" value={signedScore(terms.our_weighted_gain)}
              detail="Each week's lineup change weighted by our fantasy opponent's strength; a fantasy bye weighs 0." />
            <TermRow label="Our schedule adjustment" value={signedScore(terms.our_schedule_adjustment)}
              detail="How much our fantasy schedule moves our gain (G* minus G)." />
            <TermRow label="Counterparty lineup change (I)" value={signedScore(terms.counterparty_lineup_change)}
              detail={`Change in ${theirs}'s best starting-lineup VORP; negative means the trade weakens them.`} />
            <TermRow label="Counterparty weighted benefit (C*)" value={signedScore(terms.counterparty_weighted_benefit)}
              detail="What weakening or strengthening them is worth to us: full weight in head-to-head weeks, reduced otherwise." />
            <TermRow label="Final score" value={signedScore(terms.final_score)}
              detail="G* + C*, as computed by the scorer. Positive favors us." />
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Text size="xs" c="dimmed">
        Strength weight {weights.strength_weight} · z clamp ±{weights.z_clamp} · indirect factor {weights.indirect_factor}.
        A week's weight is 1 + strength weight × the fantasy opponent's clamped z-score.
      </Text>

      {score.bye_coverage && <ByeCoverage coverage={score.bye_coverage} ours={ours} theirs={theirs} />}
      <WeekTable score={score} teamName={teamName} />
      <WhyDetails score={score} ours={ours} theirs={theirs} playerName={playerName} />
      <Coverage score={score} ours={ours} theirs={theirs} playerName={playerName} />
    </Stack>
  )
}

function weekList(weeks: number[]) {
  return weeks.map((week) => `week ${week}`).join(', ')
}

function ByeCoverageLine({ team, coverage }: { team: string; coverage: TradeScoreByeCoverage }) {
  const parts = []
  if (coverage.fixed.length) parts.push(`covers the bye crunch in ${weekList(coverage.fixed)}`)
  if (coverage.created.length) parts.push(`opens a bye crunch in ${weekList(coverage.created)}`)
  if (!parts.length)
    parts.push(coverage.crunch_weeks_after.length ? `still short in ${weekList(coverage.crunch_weeks_after)}` : 'no bye crunch either way')
  return <List.Item>{team}: {parts.join('; ')}.</List.Item>
}

/** Weeks where NFL byes leave a lineup short (an empty or below-replacement seat), before and
 * after the trade. Evidence only: the lineup terms above already count every bye week. */
function ByeCoverage({ coverage, ours, theirs }: { coverage: NonNullable<TradeScore['bye_coverage']>; ours: string; theirs: string }) {
  return (
    <Stack gap={4} component="section" aria-label="Bye coverage">
      <Group gap="xs">
        <Text fw={600} size="sm">Bye weeks</Text>
        {coverage.us.fixed.length > 0 && <Badge color="teal" variant="light">Covers our bye crunch</Badge>}
        {coverage.us.created.length > 0 && <Badge color="orange" variant="light">Opens a bye crunch for us</Badge>}
      </Group>
      <List size="sm">
        <ByeCoverageLine team={ours} coverage={coverage.us} />
        <ByeCoverageLine team={theirs} coverage={coverage.counterparty} />
      </List>
    </Stack>
  )
}

function opponentCell(status: string, opponentId: string | null, z: number | null, teamName: (id: string | null) => string) {
  if (status === 'bye') return 'Fantasy bye'
  if (status !== 'scheduled') return 'Pairing unavailable'
  return `${teamName(opponentId)} (${formatFantasyStrength(z)})`
}

function WeekTable({ score, teamName }: { score: TradeScore; teamName: (id: string | null) => string }) {
  const unscored = new Map(score.horizon.unscored_weeks.map((w) => [w.week, w.reasons]))
  const deltas = (weeks: TradeScoreLineupWeek[]) => new Map(weeks.map((w) => [w.week, w.delta]))
  const ourDelta = deltas(score.roster_impact.us.weeks)
  const theirDelta = deltas(score.roster_impact.counterparty.weeks)
  const rowWeeks = [...new Set([...score.schedule.weeks.map((w) => w.week), ...unscored.keys()])].sort((a, b) => a - b)
  const scheduleByWeek = new Map<number, TradeScoreScheduleWeek>(score.schedule.weeks.map((w) => [w.week, w]))

  return (
    <Table.ScrollContainer minWidth={720}>
      <Table aria-label="Weekly score evidence">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Week</Table.Th>
            <Table.Th>Our lineup change</Table.Th>
            <Table.Th>Our fantasy opponent</Table.Th>
            <Table.Th>Our weight</Table.Th>
            <Table.Th>Their lineup change</Table.Th>
            <Table.Th>Their fantasy opponent</Table.Th>
            <Table.Th>Their weight</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rowWeeks.map((week) => {
            const reasons = unscored.get(week)
            const row = scheduleByWeek.get(week)
            if (reasons || !row) {
              return (
                <Table.Tr key={week} aria-label={`Week ${week}`}>
                  <Table.Th scope="row">{week}</Table.Th>
                  <Table.Td colSpan={6}>
                    <Text size="sm" fw={600}>Not scored</Text>
                    <ReasonList codes={reasons ?? []} />
                  </Table.Td>
                </Table.Tr>
              )
            }
            return (
              <Table.Tr key={week} aria-label={`Week ${week}`}>
                <Table.Th scope="row">{week}</Table.Th>
                <Table.Td>{signedScore(ourDelta.get(week))}</Table.Td>
                <Table.Td>
                  {opponentCell(row.our_status, row.our_opponent_team_id, row.our_opponent_z, teamName)}
                  {row.head_to_head && <Badge ml="xs">Head-to-head</Badge>}
                </Table.Td>
                <Table.Td>{weight(row.our_multiplier)}</Table.Td>
                <Table.Td>{signedScore(theirDelta.get(week))}</Table.Td>
                <Table.Td>
                  {row.head_to_head ? 'Us' : opponentCell(row.counterparty_status, row.counterparty_opponent_team_id, row.counterparty_opponent_z, teamName)}
                </Table.Td>
                <Table.Td>{weight(row.counterparty_weight)}</Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}

function SideMoves({ team, week, playerName }: { team: string; week: TradeScoreLineupWeek; playerName: (id: string) => string }) {
  const { entered, left } = lineupMoves(week)
  const starter = (s: { name: string | null; espn_id: string; position: string; vorp_score: number }) =>
    `${s.name || playerName(s.espn_id)} (${s.position}, ${s.vorp_score.toFixed(1)} VORP)`
  return (
    <div>
      <Text size="sm" fw={600}>{team}: Lineup VORP {week.before.toFixed(1)} → {week.after.toFixed(1)} ({signedScore(week.delta)})</Text>
      <List size="sm">
        {entered.map((s) => <List.Item key={`in-${s.espn_id}`}>Enters: {starter(s)}</List.Item>)}
        {left.map((s) => <List.Item key={`out-${s.espn_id}`}>Leaves: {starter(s)}</List.Item>)}
        {!entered.length && !left.length && <List.Item>No change to the starting lineup.</List.Item>}
        {week.held_slots.length > 0 && <List.Item>Held without metrics: {week.held_slots.join(', ')}</List.Item>}
        {week.excluded_players.map((p) => (
          <List.Item key={`ex-${p.espn_id}`}>Left out, {playerName(p.espn_id)}: {reasonLabel(p.reason).label}</List.Item>
        ))}
      </List>
    </div>
  )
}

function WhyDetails({ score, ours, theirs, playerName }: {
  score: TradeScore; ours: string; theirs: string; playerName: (id: string) => string
}) {
  const theirWeeks = new Map(score.roster_impact.counterparty.weeks.map((w) => [w.week, w]))
  return (
    <Stack gap="xs">
      {score.roster_impact.us.weeks.map((week) => {
        const their = theirWeeks.get(week.week)
        return (
          <details key={week.week} role="group" aria-label={`Week ${week.week} lineup changes`}>
            <summary>Week {week.week}: why the lineups change</summary>
            <Stack gap="xs" mt="xs">
              <SideMoves team={ours} week={week} playerName={playerName} />
              {their && <SideMoves team={theirs} week={their} playerName={playerName} />}
            </Stack>
          </details>
        )
      })}
    </Stack>
  )
}

function Coverage({ score, ours, theirs, playerName }: {
  score: TradeScore; ours: string; theirs: string; playerName: (id: string) => string
}) {
  const { coverage, raw_vorp: raw, roster_impact: impact, strength_metric: metric } = score
  const gaps: string[] = []
  if (coverage.unmapped_traded_espn_ids.length) {
    gaps.push(`Traded players without a player mapping: ${coverage.unmapped_traded_espn_ids.map(playerName).join(', ')}.`)
  }
  if (coverage.partial_roster_weeks.length) {
    gaps.push(`Rostered players with missing metrics or mapping in weeks ${coverage.partial_roster_weeks.join(', ')}; they were left out of those lineups.`)
  }
  if (coverage.nfl_schedule_unavailable_weeks.length) {
    gaps.push(`NFL schedule unavailable for weeks ${coverage.nfl_schedule_unavailable_weeks.join(', ')}.`)
  }
  if (raw.missing_player_ids.length) {
    gaps.push(`No VORP data for ${raw.missing_player_ids.length} player(s) in week ${raw.week} - excluded from raw VORP totals above.`)
  }
  if (raw.unmapped_espn_ids.length) {
    gaps.push(`ESPN players not mapped for raw VORP: ${raw.unmapped_espn_ids.map(playerName).join(', ')}.`)
  }
  for (const [team, side] of [[ours, impact.us], [theirs, impact.counterparty]] as const) {
    if (side.exceeds_roster_limit) {
      gaps.push(`${team} would have ${side.roster_size_after} rostered players, over the ${side.roster_limit}-player limit.`)
    }
  }
  return (
    <Stack gap="xs" component="section" aria-label="Score coverage">
      <Text size="sm" fw={600}>Coverage and sources</Text>
      {gaps.length ? <List size="sm">{gaps.map((gap) => <List.Item key={gap}>{gap}</List.Item>)}</List>
        : <Text size="sm">No coverage gaps reported.</Text>}
      <TradeContextProvenance snapshot={score.roster_snapshot} />
      <Text size="sm">
        Fantasy opponent strength: {metric.source} · {metric.teams_with_strength} teams with observed strength.
        This is past fantasy scoring, separate from NFL matchup difficulty.
      </Text>
    </Stack>
  )
}

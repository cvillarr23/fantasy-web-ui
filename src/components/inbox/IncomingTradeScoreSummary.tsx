import { Badge, Group, Stack, Text } from '@mantine/core'
import type { IncomingTrade } from '../../api/tradeInboxTypes'
import { signedScore } from '../tradeScore/tradeScoreFormat'
import { reasonLabel } from '../tradeScore/tradeScoreReasons'
export function IncomingTradeScoreSummary({ row }: { row: IncomingTrade }) {
  const s = row.score
  const numeric = typeof s?.final_score === 'number' && Number.isFinite(s.final_score)
  return (
    <Stack gap="xs" component="section" aria-label="Incoming score evidence">
      <Group>
        <Badge color={numeric ? 'blue' : 'gray'}>
          {row.status === 'unparsed'
            ? 'Unscored — unparsed'
            : numeric
              ? 'Scored'
              : `Unscored — ${s?.state ?? 'unavailable'}`}
        </Badge>
        {s?.state === 'incomplete' && <Badge color="yellow">Incomplete evidence</Badge>}
        {s?.stale && <Badge color="yellow">Stale score</Badge>}
        {s?.complete_horizon === false && <Badge color="yellow">Incomplete horizon</Badge>}
      </Group>
      <Text fw={700}>
        Final score: {numeric ? signedScore(s!.final_score) : 'Score unavailable'}
      </Text>
      <Text size="sm">G*: Unavailable · C*: Unavailable · Schedule adjustment: Unavailable</Text>
      <Text size="sm">
        Horizon coverage:{' '}
        {s?.complete_horizon === true
          ? 'Complete'
          : s?.complete_horizon === false
            ? 'Incomplete'
            : 'Unavailable'}
        . Week counts and unscored-week reasons: unavailable from stored inbox evidence.
      </Text>
      <Text size="sm">
        Raw ΔVORP: {signedScore(s?.raw_delta_vorp)} — single-week evidence only (week{' '}
        {s?.as_of_week ?? 'unavailable'}).
      </Text>
      {s && (
        <Text size="xs">
          Scored for week {s.as_of_week} at {s.scored_at}. Full score breakdown is unavailable from
          stored inbox evidence.
        </Text>
      )}
      {s?.unmapped_espn_ids.length ? (
        <Text c="orange">Unmapped players: {s.unmapped_espn_ids.join(', ')}</Text>
      ) : null}
      {row.other_items.length > 0 && (
        <Text c="orange">
          Draft-pick, FAAB or other non-player items are present and are not scored. Details:{' '}
          {JSON.stringify(row.other_items)}
        </Text>
      )}
      {s?.exceeds_roster_limit && (
        <Text c="red">Exceeds roster limit — drops are not simulated. Accept is disabled.</Text>
      )}
      {[...(s?.unavailable_reasons ?? []), ...(s?.partial_reasons ?? [])].map((code, i) => (
        <Text size="sm" key={`${code}:${i}`}>
          {reasonLabel(code).label}
        </Text>
      ))}
      {s?.error && <Text size="sm">Score warning: {s.error}</Text>}
      {row.shadow_policy ? (
        <Group>
          <Badge color="gray" variant="light">
            {row.shadow_policy.would === 'none'
              ? 'Shadow: no recommendation'
              : `Shadow: Would ${row.shadow_policy.would}`}{' '}
            — not acted on
          </Badge>
          <Text size="sm">{row.shadow_policy.reason}</Text>
        </Group>
      ) : (
        <Text size="sm">Shadow policy unavailable — no recommendation acted on.</Text>
      )}
    </Stack>
  )
}

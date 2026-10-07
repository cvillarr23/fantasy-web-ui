import { Alert, Badge, Group, List, Stack, Text } from '@mantine/core'
import type { ProposalEvaluation, TradeOffer } from '../../api/types'
import { reasonLabel } from './tradeScoreReasons'
import { TradeScoreBreakdown } from './TradeScoreBreakdown'
import { isProposalEvaluation, resolvePointer, signedScore } from './tradeScoreFormat'

function evidenceValue(value: unknown): string {
  if (value === null) return 'unknown'
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (typeof value === 'number') return String(Number(value.toFixed(2)))
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function PitchEvidence({ evaluation, message }: { evaluation: ProposalEvaluation; message: string | null | undefined }) {
  const pitch = evaluation.pitch
  if (!pitch?.evidence.length) return null
  const cited = new Set(pitch.cited_evidence_ids)
  return (
    <Stack gap="xs">
      <Text size="sm" fw={600}>Evidence the pitch was written from</Text>
      {pitch.message !== message && (
        <Alert color="yellow">The stored pitch differs from this offer's message, so the evidence below may not match it.</Alert>
      )}
      <List size="sm" aria-label="Pitch evidence">
        {pitch.evidence.map((item) => {
          const value = resolvePointer(evaluation.score, item.path)
          return (
            <List.Item key={item.id}>
              {item.text}
              {cited.has(item.id) && <Badge size="xs" ml="xs">Cited in pitch</Badge>}
              <Text size="xs" c="dimmed">
                {value === undefined
                  ? `Score field ${item.path} not found in the stored score.`
                  : `Score field: ${item.path} = ${evidenceValue(value)}`}
              </Text>
            </List.Item>
          )
        })}
      </List>
    </Stack>
  )
}

/** Shows only the evidence stored when the proposal was generated, never a fresh score, so
 * the numbers always match what the pitch was written from. */
export function ProposalScoreSummary({ offer, teamNames }: {
  offer: TradeOffer
  teamNames?: Record<string, string>
}) {
  const evaluation = offer.evaluation
  let body
  // JSON can't carry undefined, so a missing field means the API didn't send evidence at all,
  // while null means the API looked and the generator stored none. Only null says "not stored".
  if (evaluation === undefined) {
    body = <Text size="sm" c="dimmed">Score evidence isn't available from the API for this proposal.</Text>
  } else if (evaluation === null) {
    body = <Text size="sm" c="dimmed">No score evidence was stored for this proposal.</Text>
  } else if (!isProposalEvaluation(evaluation)) {
    const version = (evaluation as { version?: unknown }).version
    body = (
      <Text size="sm" c="dimmed">
        Stored score evidence uses a format this page does not recognize ({String(version ?? 'no version')}), so it is not shown.
      </Text>
    )
  } else {
    const { score, request, ranking } = evaluation
    const final = score.score.final_score
    const scored = score.horizon.scored_weeks.length
    const total = score.horizon.end_week - score.horizon.start_week + 1
    const basis = ranking?.basis === 'final_score' ? 'final score'
      : ranking?.basis === 'our_lineup_gain' ? 'our lineup gain' : ranking?.basis
    body = (
      <Stack gap="xs">
        <Group gap="xs">
          <Text fw={700}>{final == null ? 'Score unavailable' : signedScore(final)}</Text>
          <Badge variant="light">{`Weeks ${score.horizon.start_week}–${score.horizon.end_week} · ${scored} of ${total} scored`}</Badge>
          {!score.horizon.complete_horizon && <Badge color="yellow">Partial horizon</Badge>}
        </Group>
        {final == null && (
          <Text size="sm">{score.score.final_score_unavailable_reasons.map((code) => reasonLabel(code).label).join('; ')}</Text>
        )}
        {/* Kept outside the collapsed breakdown: a proposal ranked by our lineup gain has no
            final score, and our value must stay distinct from what the trade does to them. */}
        <Text size="sm" aria-label="Score terms summary">
          {`Our lineup gain ${signedScore(score.score.our_lineup_gain)} · Counterparty change ${signedScore(score.score.counterparty_lineup_change)} · Our schedule adjustment ${signedScore(score.score.our_schedule_adjustment)}`}
        </Text>
        <Text size="xs" c="dimmed">
          Scored for week {request.week} with a {request.horizon}-week horizon at{' '}
          <time dateTime={evaluation.evaluated_at}>{new Date(evaluation.evaluated_at).toLocaleString()}</time>
          {ranking && ` · Ranked ${ranking.rank} of ${ranking.packages_eligible} eligible packages by ${basis}`}
        </Text>
        <details role="group" aria-label="Score breakdown">
          <summary>Score breakdown</summary>
          <Stack gap="md" mt="sm">
            <TradeScoreBreakdown score={score} teamNames={teamNames} />
            <PitchEvidence evaluation={evaluation} message={offer.message} />
          </Stack>
        </details>
      </Stack>
    )
  }
  return (
    <Stack gap="xs" my="sm" component="section" aria-label="Proposal score">
      <Text size="sm" fw={600}>Schedule-aware score</Text>
      {body}
    </Stack>
  )
}

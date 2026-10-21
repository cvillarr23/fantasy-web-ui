import { Badge, Group, Stack, Text } from '@mantine/core'
import type { TradeScore } from '../../api/types'
import { isProposable, scoreTone, signedScore, toneColor } from './tradeScoreFormat'
import { InfoTip } from '../ui/InfoTip'
import { tradeGlossaryForWeights } from './tradeGlossary'

export function ScoreVerdict({ score, live = false }: { score: TradeScore; live?: boolean }) {
  const ready = isProposable(score)
  const { horizon } = score
  return <Group className="trade-verdict-strip" justify="space-between">
    <Stack gap={4}>
      <Text fw={700} c={ready ? 'var(--incoming)' : 'var(--warn)'}>{ready ? "✓ Proposable: we gain, they don't lose" : 'Review score and coverage before proposing'}</Text>
      <Text size="xs" c="dimmed">{live ? 'Re-scored live just now' : 'Scored just now'} · <span>{`Weeks ${horizon.start_week}–${horizon.end_week} · ${horizon.scored_weeks.length} of ${horizon.end_week - horizon.start_week + 1} scored`}</span></Text>
      {!horizon.complete_horizon && <Badge color="yellow">Partial horizon</Badge>}
    </Stack>
    <Stack gap={2}>
      <Text size="xs">Final score <InfoTip label="the final score">{tradeGlossaryForWeights(score.weights).finalScore}</InfoTip></Text>
      <Text size="xl" fw={800} c={toneColor[scoreTone(score.score.final_score)]}>{score.score.final_score == null ? 'Score unavailable' : signedScore(score.score.final_score)}</Text>
    </Stack>
  </Group>
}

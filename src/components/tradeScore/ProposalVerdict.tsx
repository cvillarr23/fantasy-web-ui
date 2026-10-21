import { Stack, Text } from '@mantine/core'
import type { TradeOffer } from '../../api/types'
import { InfoTip } from '../ui/InfoTip'
import { isProposalEvaluation, scoreTone, signedScore, toneColor } from './tradeScoreFormat'
import { tradeGlossaryForWeights } from './tradeGlossary'

export function ProposalVerdict({ offer }: { offer: TradeOffer }) {
  const evaluation = isProposalEvaluation(offer.evaluation) ? offer.evaluation : undefined
  const value = evaluation?.score.score.final_score
  return <Stack gap={2} align="flex-end" className="proposal-verdict">
    <Text size="xs" c="dimmed">Final score {evaluation && <InfoTip label="the final score">{tradeGlossaryForWeights(evaluation.score.weights).finalScore}</InfoTip>}</Text>
    <Text className="proposal-final" data-unavailable={value == null || undefined} fw={800} c={toneColor[scoreTone(value)]}>{value == null ? 'Score unavailable' : signedScore(value)}</Text>
    {evaluation?.ranking && <Text size="xs" c="dimmed">Rank {evaluation.ranking.rank} of {evaluation.ranking.packages_eligible} packages</Text>}
  </Stack>
}

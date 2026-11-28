import { List, Text } from '@mantine/core'
import type { TradeScoreAcceptance } from '../../api/types'
import { hasNoOfferHistory, hasOfferHistoryUnavailable, percentText, signedScore } from './tradeScoreFormat'

/** The terms behind an acceptance estimate. Each is an adjustment to the log-odds of acceptance
 * (positive pushes toward yes), so it is signed and not a percent. */
export function AcceptanceTerms({ acceptance }: { acceptance: TradeScoreAcceptance }) {
  const { terms, inputs } = acceptance
  const term = (value: number | null) => (value == null ? 'Not available' : signedScore(value, 2))
  const { history } = inputs
  return (
    <div aria-label="Acceptance terms">
      {hasNoOfferHistory(acceptance.unavailable_inputs)
        ? <Text size="sm">No offer history yet: this estimate leans on the league-wide acceptance rate ({percentText(history.league_rate)}).</Text>
        : hasOfferHistoryUnavailable(acceptance.unavailable_inputs)
          ? <Text size="sm">Offer history unavailable: this estimate leans on the league-wide acceptance rate ({percentText(history.league_rate)}).</Text>
          : <Text size="sm">Their history with us: {history.accepted} accepted, {history.declined} declined, {history.expired} expired of {history.offers} offers.</Text>}
      <List size="sm">
        <List.Item>History: {signedScore(terms.base_logit, 2)}</List.Item>
        <List.Item>Activity: {term(terms.activity)}</List.Item>
        <List.Item>Fairness: {term(terms.fairness)}</List.Item>
        <List.Item>Market: {term(terms.market)}</List.Item>
      </List>
    </div>
  )
}

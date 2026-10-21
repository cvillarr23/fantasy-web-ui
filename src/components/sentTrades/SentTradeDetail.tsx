import { useState } from 'react'
import { Button, Group } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { scoreTrade } from '../../api/client'
import { queryClient } from '../../api/queryClient'
import { outcomeLabels, sentStatusLine, tradeTimeline, type SentTrade } from '../../api/sentTrades'
import type { DraftConfig, TradeScore, TradeScoreRequest } from '../../api/types'
import { BadgeSlot } from '../ui/BadgeSlot'
import { ErrorAlert } from '../ui/ErrorAlert'
import { StatTile } from '../ui/StatTile'
import { isProposalEvaluation } from '../tradeScore/tradeScoreFormat'
import { tradeGlossaryForWeights } from '../tradeScore/tradeGlossary'
import { reasonLabel } from '../tradeScore/tradeScoreReasons'

import { outcomeColors, playerLabel } from './sentTradePresentation'

function scoreReason(now: TradeScore, then: TradeScore | undefined): string {
  if (now.score.final_score == null) return now.score.final_score_unavailable_reasons.map(code => reasonLabel(code).label).join('; ') || 'Current score unavailable.'
  if (!then) return 'Scored using current rosters, projections and schedule.'
  if (now.as_of_week !== then.as_of_week) return `Scoring window moved from week ${then.as_of_week} to week ${now.as_of_week}.`
  if (now.score.our_weighted_gain !== then.score.our_weighted_gain) return 'Our schedule-weighted lineup gain changed with current roster and projection data.'
  if (now.score.counterparty_weighted_benefit !== then.score.counterparty_weighted_benefit) return 'The cost of helping them changed with current lineup and schedule data.'
  return now.score.final_score === then.score.final_score ? 'Unchanged from the stored scan score.' : 'Updated roster, projection or schedule data changed the score.'
}

export function SentTradeDetail({ trade, team, config, week }: { trade: SentTrade; team: string; config: DraftConfig; week: number | null }) {
  const [draftOpen, setDraftOpen] = useState(false)
  const { offer, outcome } = trade
  const pending = outcome === 'waiting' && !trade.conflict
  const stored = isProposalEvaluation(offer.evaluation) ? offer.evaluation : undefined
  const horizon = stored?.request.horizon || 4
  const request: TradeScoreRequest = {
    league_id: config.league_id, season: config.season, week: week || 1, horizon,
    our_team_id: config.team_id, counterparty_team_id: offer.to_team_id || '',
    send_espn_ids: offer.outgoing_player_ids, receive_espn_ids: offer.incoming_player_ids,
  }
  const canScore = pending && week != null && !!offer.to_team_id && offer.outgoing_player_ids.length > 0 && offer.incoming_player_ids.length > 0
  const live = useQuery({
    queryKey: ['sent-trade-score', trade.key, request], queryFn: () => scoreTrade(request),
    enabled: canScore, staleTime: 60_000, retry: false, refetchOnWindowFocus: false,
  }, queryClient)
  const finished = ['accepted', 'declined', 'countered'].includes(outcome)
  const current = canScore ? (live.isError ? undefined : live.data) : finished ? stored?.score : undefined
  const glossary = tradeGlossaryForWeights(current?.weights || stored?.score.weights)
  const reason = canScore ? live.isFetching ? 'Checking current rosters and score…' : live.isError ? 'Current score unavailable.' : current ? scoreReason(current, stored?.score) : 'Current score unavailable.'
    : finished ? 'Finished offer · showing the stored scan score.'
      : outcome === 'not_sent' ? 'Offer was not sent.'
        : !week ? 'Current league week is unavailable; no live score requested.' : 'Send or player identity is unconfirmed; no live score requested.'
  const timeline = tradeTimeline(trade)
  const espn = `https://fantasy.espn.com/football/league?leagueId=${encodeURIComponent(config.league_id)}&seasonId=${config.season}&view=transactions`

  return <article className="sent-detail" aria-label={`Trade with ${team}`}>
    <Group justify="space-between" align="flex-start">
      <div className="sent-detail-heading">
        <span className="sent-eyebrow">Trade with</span>
        <h2>{team}</h2>
        <BadgeSlot label={sentStatusLine(trade)} color={outcomeColors[outcome]} size="sm" />
      </div>
      <Group gap="xs">
        <Button component="a" href={espn} target="_blank" rel="noopener noreferrer" variant="default" title="Open the league on ESPN; a direct offer link is not recorded">View on ESPN</Button>
        {pending && trade.status === 'submitted' && <Button disabled variant="default" title="Withdrawing isn't supported yet">Withdraw offer</Button>}
        {outcome === 'countered' && <Button component={Link} to="/inbox" variant="light">Open Inbox</Button>}
      </Group>
    </Group>
    <div className="sent-sides">
      {(['incoming', 'outgoing'] as const).map(side => <section key={side} className={`sent-side sent-side-${side}`} aria-label={side === 'incoming' ? 'You get' : 'You give'}>
        <h3>{side === 'incoming' ? 'You get' : 'You give'}</h3>
        <ul>{offer[`${side}_players`].map(player => <li key={player.espn_id}>{playerLabel(player)}</li>)}</ul>
      </section>)}
    </div>
    <div className="sent-scores" aria-label="Review scores">
      <StatTile label="Score when approved" value={stored?.score.score.final_score} info={tradeGlossaryForWeights(stored?.score.weights).finalScore}
        caption={stored ? 'Stored scan score; approval-time re-score not recorded.' : 'Approval-time score and stored scan evidence unavailable.'} />
      <StatTile label="Score now" value={current?.score.final_score} info={glossary.finalScore} caption={reason} />
      <StatTile label="Cost of helping them" value={current?.score.counterparty_weighted_benefit} info={glossary.costOfHelpingThem}
        caption={finished ? 'From the stored scan score' : 'Current schedule-weighted penalty (C*)'} />
    </div>
    {current && !current.horizon.complete_horizon && <p className="sent-note">Partial horizon · {current.horizon.scored_weeks.length} weeks scored. Totals cover only scored weeks.</p>}
    {canScore && live.isError && <ErrorAlert onRetry={() => { void live.refetch() }}>Could not score this offer now: {live.error.message}</ErrorAlert>}
    <section>
      <h3>What happened</h3>
      <ol className="sent-timeline" aria-label="What happened">
        {timeline.map((event, index) => <li key={`${index}-${event.title}`} className={event.current ? `sent-event-current sent-event-${outcome}` : ''}>
          <span className="sent-event-dot" aria-hidden="true" />
          <div><strong>{event.title}</strong><p>{event.detail}</p></div>
        </li>)}
      </ol>
    </section>
    <section className="sent-message">
      <Group gap="xs"><h3>Approved message</h3>
        {offer.message_edited && <BadgeSlot label={offer.edited_by ? `Edited by ${offer.edited_by}` : 'Edited message'} color="clay" />}
      </Group>
      <p className="sent-note">ESPN message delivery is not recorded; this is the text approved for sending.</p>
      <blockquote>{offer.message || 'No message recorded.'}</blockquote>
      {offer.message_edited && (offer.drafted_message != null ? <>
        <button type="button" className="sent-draft-toggle" aria-expanded={draftOpen} aria-controls="sent-generated-draft" onClick={() => setDraftOpen(open => !open)}>
          {draftOpen ? 'Hide the generated draft' : 'Show the generated draft'}
        </button>
        {draftOpen && <blockquote id="sent-generated-draft" className="sent-draft">{offer.drafted_message}</blockquote>}
      </> : <p className="sent-note">Generated draft not recorded.</p>)}
    </section>
    {offer.approval?.tracking_id && <p className="sent-note sent-tracking">Tracking ID: {offer.approval.tracking_id}</p>}
    <span className="sent-sr-only">{outcomeLabels[outcome]}</span>
  </article>
}

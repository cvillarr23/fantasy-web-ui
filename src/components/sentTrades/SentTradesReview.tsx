import { useState } from 'react'
import { Button, Group } from '@mantine/core'
import { Link } from 'react-router-dom'
import type { DraftConfig } from '../../api/types'
import { dateLabel, outcomeLabels, type SentOutcome, type SentTrade } from '../../api/sentTrades'
import { BadgeSlot } from '../ui/BadgeSlot'
import { EmptyState } from '../ui/EmptyState'
import { PageHeader } from '../ui/PageHeader'
import { SentTradeDetail } from './SentTradeDetail'
import { playerLabel, outcomeColors } from './sentTradePresentation'
import './sentTrades.css'

interface Props {
  trades: SentTrade[]
  names?: Record<string, string>
  config: DraftConfig
  week: number | null
  onRefresh?: () => void
  refreshing?: boolean
}
export function SentTradesReview({ trades, names, config, week, onRefresh, refreshing }: Props) {
  const [filter, setFilter] = useState<SentOutcome | 'all'>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const shown = trades.filter(trade => filter === 'all' || trade.outcome === filter)
  const current = shown.find(trade => trade.key === selected) || shown[0]
  const team = (trade: SentTrade) => names?.[trade.offer.to_team_id || ''] || `Team ${trade.offer.to_team_id || 'unknown'}`
  const count = (value: SentOutcome) => trades.filter(trade => trade.outcome === value).length
  // Core doesn't report the other manager's answer yet, so answered outcomes only get a filter
  // once some trade actually has one; a permanent "0" would read as "none so far".
  const answered: SentOutcome[] = ['countered', 'accepted', 'declined']
  const filters = (['all', 'waiting', 'countered', 'accepted', 'declined', 'not_sent'] as const)
    .filter(value => value === 'all' || !answered.includes(value) || count(value) > 0)
  return <div className="sent-trades">
    <Link to="/trades" className="sent-back">← Trades</Link>
    <PageHeader title="Sent trades" level={1} subtitle="Every offer you've approved, what happened to it, and how it looks now."
      actions={onRefresh && <Button variant="default" loading={refreshing} onClick={onRefresh}>Refresh offers</Button>} />
    <Group gap="xs" role="group" aria-label="Filter by outcome" className="sent-filters">
      {filters.map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setSelected(null) }}>
        {value === 'all' ? 'All' : outcomeLabels[value]} <span>{value === 'all' ? trades.length : count(value)}</span>
      </button>)}
    </Group>
    {!shown.length ? <EmptyState tone="alert">{trades.length ? `No ${filter === 'all' ? '' : filter === 'not_sent' ? 'unsent' : outcomeLabels[filter].toLowerCase()} offers.` : 'No approved offers yet. Offers appear here after approval.'}</EmptyState> : <div className="sent-columns">
      <div className="sent-list" role="group" aria-label="Approved offers">
        {shown.map(trade => <button key={trade.key} type="button" className="sent-row" aria-pressed={current?.key === trade.key} onClick={() => setSelected(trade.key)}>
          <span className="sent-row-title"><strong>{team(trade)}</strong><BadgeSlot label={outcomeLabels[trade.outcome]} color={outcomeColors[trade.outcome]} /></span>
          <span>Get {trade.offer.incoming_players.map(playerLabel).join(', ')} · give {trade.offer.outgoing_players.map(playerLabel).join(', ')}</span>
          <span className="sent-row-date">Approved {dateLabel(trade.offer.approval?.approved_at)}</span>
        </button>)}
      </div>
      {current && <SentTradeDetail key={`${config.league_id}:${config.team_id}:${config.season}:${current.key}`} trade={current} team={team(current)} config={config} week={week} />}
    </div>}
  </div>
}

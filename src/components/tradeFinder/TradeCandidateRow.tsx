import { Button } from '@mantine/core'
import type { TradeCandidatePlayer } from '../../api/tradeCandidateTypes'
import { InfoTip } from '../ui/InfoTip'
import { tradeGlossary, tradeGlossaryForWeights } from '../tradeScore/tradeGlossary'
import { signedScore } from '../tradeScore/tradeScoreFormat'
import { GainBreakdown } from './GainBreakdown'
import { scoreTone } from './tradeFinderFormat'
import type { CandidateEvidenceProps } from './useCandidateScore'

const reasons: Record<string, string> = {
  no_scored_weeks: 'No scored weeks', no_gain_for_us: 'No gain for us', hurts_counterparty: 'Hurts them',
  exceeds_roster_limit: 'Exceeds roster limit', unmapped_traded_player: 'Unmapped player',
}
export function CandidateStatus({ candidate }: Pick<CandidateEvidenceProps, 'candidate'>) {
  const text = candidate.status === 'proposable' ? '✓ Proposable' : candidate.status === 'needs_drop' ? 'Needs a drop'
    : candidate.reasons.map((reason) => reasons[reason] ?? reason.replaceAll('_', ' ')).join(' · ') || 'One-sided'
  return <span className={`finder-status finder-status-${candidate.status}`}>{text}</span>
}

function PlayerChips({ players, side }: { players: TradeCandidatePlayer[]; side: 'receive' | 'send' }) {
  return <div className={`finder-players finder-${side}`}>
    <span className="finder-mobile-label">{side === 'receive' ? 'You get' : 'You give'}</span>
    {players.map((p) => <div className="finder-player" key={p.espn_id}>
      <span className="finder-position">{p.position ?? '?'}</span>
      <span className="finder-player-name"><strong>{p.name || p.espn_id}</strong><small>{p.nfl_team ?? 'Team unknown'} · bye {p.nfl_bye_week == null ? 'unknown' : `wk ${p.nfl_bye_week}`}</small></span>
      <span className="finder-vorp">{p.vorp == null ? '—' : p.vorp.toFixed(1)}<small>VORP</small></span>
    </div>)}
  </div>
}
const candidateHeaders = [
  ['Team', 'The opponent who would receive this offer.'], ['You get', tradeGlossary.vorp], ['You give', tradeGlossary.vorp],
  ['Our gain', tradeGlossary.ourLineupGain], ['Theirs', tradeGlossary.theirChange],
  ['Final', tradeGlossaryForWeights(undefined).finalScore], ['Status', tradeGlossary.statuses], ['Details', 'Inspect both starting lineups and re-score the trade live before acting.'],
]
export function TradeCandidateHeaders() {
  return <div className="finder-row finder-head" role="row">{candidateHeaders.map(([label, help]) => <div key={label} role="columnheader">{label} <InfoTip label={label.toLowerCase()}>{help}</InfoTip></div>)}</div>
}
export function TradeCandidateRow({ selected, onSelect, ...props }: CandidateEvidenceProps & { selected: boolean; onSelect: () => void }) {
  const { candidate: c } = props
  return <div role="row" className={`finder-row finder-candidate${selected ? ' finder-selected' : ''}${c.status === 'one_sided' ? ' finder-one-sided' : ''}`}>
    <div role="cell" className="finder-row-team"><strong>{c.counterparty.name}</strong><small>{c.shape.replace('for', '-for-')}</small>
      {!c.complete_horizon && <small>{c.scored_weeks.length} of {c.horizon_weeks.length} weeks scored</small>}
      {c.bye_coverage.us.fixed.length > 0 && <small className="finder-positive">Covers wk {c.bye_coverage.us.fixed.join(', ')}</small>}
    </div>
    <div role="cell"><PlayerChips players={c.receive} side="receive" /></div>
    <div role="cell"><PlayerChips players={c.send} side="send" /></div>
    <div role="cell"><span className="finder-mobile-label">Our gain</span><GainBreakdown {...props} side="us" />
      <span className="finder-gain-track" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.max(0, c.our_lineup_gain ?? 0) * 4)}%` }} /></span>
    </div>
    <div role="cell"><span className="finder-mobile-label">Theirs</span><GainBreakdown {...props} side="counterparty" /></div>
    <div role="cell"><span className="finder-mobile-label">Final</span><strong className={scoreTone(c.final_score)}>{signedScore(c.final_score)}</strong></div>
    <div role="cell"><span className="finder-mobile-label">Status</span><CandidateStatus candidate={c} /></div>
    <div role="cell" className="finder-row-action"><Button size="xs" variant={selected ? 'filled' : 'default'} aria-pressed={selected} onClick={onSelect}>Details</Button></div>
  </div>
}

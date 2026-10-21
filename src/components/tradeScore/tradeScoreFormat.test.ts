import { expect, it } from 'vitest'
import { completeScore, proposalEvaluation } from './fixtures'
import { formatEvidenceValue, isProposable, isProposalEvaluation, lineupMoves, resolvePointer, scoreInputSignature, scoreTone, signedScore } from './tradeScoreFormat'

it('formats returned values with an explicit sign', () => {
  expect(signedScore(3.14159)).toBe('+3.1')
  expect(signedScore(-4.44)).toBe('-4.4')
  expect(signedScore(0)).toBe('0.0')
  expect(signedScore(1.234, 2)).toBe('+1.23')
})

it.each([null, undefined])('never renders a missing value (%s) as zero', (value) => {
  expect(signedScore(value)).toBe('Not available')
})

it('lists starters who enter and leave the lineup by ESPN id', () => {
  const week = completeScore().roster_impact.us.weeks[0]
  const moves = lineupMoves(week)
  expect(moves.entered.map((s) => s.espn_id)).toEqual(['200'])
  expect(moves.left.map((s) => s.espn_id)).toEqual(['100'])
})

it('treats the same trade in a different order as the same scoring input', () => {
  const base = { league_id: '1', season: 2026, week: 5, horizon: 4, our_team_id: '7', counterparty_team_id: '8' }
  expect(scoreInputSignature({ ...base, send_espn_ids: ['1', '2'], receive_espn_ids: ['3'] }))
    .toBe(scoreInputSignature({ ...base, send_espn_ids: ['2', '1'], receive_espn_ids: ['3'] }))
  expect(scoreInputSignature({ ...base, send_espn_ids: ['1'], receive_espn_ids: ['3'] }))
    .not.toBe(scoreInputSignature({ ...base, horizon: 5, send_espn_ids: ['1'], receive_espn_ids: ['3'] }))
})

it('resolves JSON Pointers into the stored score, including escaped keys', () => {
  const score = completeScore()
  expect(resolvePointer(score, '/roster_impact/counterparty/weeks/0/delta')).toBe(-1.1)
  expect(resolvePointer(score, '/schedule/weeks/1/head_to_head')).toBe(true)
  expect(resolvePointer({ 'a/b': { '~c': 1 } }, '/a~1b/~0c')).toBe(1)
  expect(resolvePointer(score, '/roster_impact/nope/0')).toBeUndefined()
  expect(resolvePointer(score, 'not-a-pointer')).toBeUndefined()
})

it('accepts only the evaluation envelope and score version it understands', () => {
  expect(isProposalEvaluation(proposalEvaluation())).toBe(true)
  expect(isProposalEvaluation(null)).toBe(false)
  expect(isProposalEvaluation({ ...proposalEvaluation(), version: 'proposal-evaluation-v2' })).toBe(false)
  expect(isProposalEvaluation({ ...proposalEvaluation(), score: { ...completeScore(), scoring_version: 'trade-score-v2' } })).toBe(false)
  expect(isProposalEvaluation({ ...proposalEvaluation(), score: { scoring_version: 'trade-score-v1' } })).toBe(false)
})

it('formats scalar evidence values', () => {
  expect(formatEvidenceValue(-1.1)).toBe('-1.1')
  expect(formatEvidenceValue(13.84000001)).toBe('13.84')
  expect(formatEvidenceValue(true)).toBe('yes')
  expect(formatEvidenceValue(false)).toBe('no')
  expect(formatEvidenceValue(null)).toBe('unknown')
  expect(formatEvidenceValue('scheduled')).toBe('scheduled')
})

it('formats the object values the proposal generator cites, never as raw JSON', () => {
  const score = completeScore()
  expect(formatEvidenceValue(score.send[0])).toBe('Sent Back (RB, KC)')
  expect(formatEvidenceValue({ ...score.receive[0], name: null, nfl_team: null })).toBe('ESPN player 200 (WR)')
  expect(formatEvidenceValue(score.roster_impact.counterparty.weeks[0].starters_after[0])).toBe('Sent Back (RB, 4.3 VORP)')
  expect(formatEvidenceValue({ week: 8, reasons: ['lineup_unfillable', 'brand_new_reason'] }))
    .toBe('Week 8 not scored: Lineup could not be filled; Unrecognized reason (brand_new_reason)')
  expect(formatEvidenceValue({ something: 'else' })).toBe('{"something":"else"}')
})

it('treats a lineup-gain-ranked score with no final score as proposable', () => {
  const score = completeScore()
  const gated = { ...score, score: { ...score.score, final_score: null, our_lineup_gain: 2.4, counterparty_lineup_change: 0 } }
  expect(isProposable(gated)).toBe(true)
  expect(isProposable({ ...gated, score: { ...gated.score, our_lineup_gain: 0 } })).toBe(false)
  expect(isProposable({ ...gated, score: { ...gated.score, counterparty_lineup_change: -0.1 } })).toBe(false)
  expect(isProposable({ ...gated, horizon: { ...gated.horizon, scored_weeks: [] } })).toBe(false)
})

it('picks a tone from the displayed value, with a neutral band around zero', () => {
  expect(scoreTone(0.04)).toBe('neutral')
  expect(scoreTone(-0.049)).toBe('neutral')
  expect(scoreTone(0.06)).toBe('positive')
  expect(scoreTone(-0.06)).toBe('negative')
  expect(scoreTone(null)).toBe('neutral')
})

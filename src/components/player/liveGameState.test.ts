import { expect, it } from 'vitest'
import type { LiveBlock } from '../../api/types'
import { finalLineText, finalResultText, kickoffText, matchupText, liveLineParts, liveState, opponentText, statLineText } from './liveGameState'

const block = (over: Partial<LiveBlock> = {}): LiveBlock => ({
  status: 'in_progress', period: 3, clock: '8:42', home_abbr: 'ATL', home_score: 17, away_abbr: 'TB', away_score: 14,
  possession: 'ATL', yard_line: 'TB 12', red_zone: true, stat_line: null, live_points: null, updated_at: null, ...over,
})

it('picks the card state from the game status, and none without one', () => {
  expect(liveState(block())).toBe('live')
  expect(liveState(block({ status: 'not_started' }))).toBe('upcoming')
  expect(liveState(block({ status: 'final' }))).toBe('final')
  expect(liveState(block({ status: null }))).toBe('none')
  expect(liveState(null)).toBe('none')
  expect(liveState(undefined)).toBe('none')
})

it('describes a live game: clock, score, ball and red zone', () => {
  expect(liveLineParts(block())).toEqual({ clock: 'Q3 8:42', score: 'TB 14–17 ATL', field: 'ATL ball · TB 12', redZone: true })
  expect(liveLineParts(block({ period: 5, red_zone: false })).clock).toBe('OT 8:42')
})

it('shows a dash for unknown values, never zero', () => {
  const parts = liveLineParts(block({ period: null, clock: null, home_score: null, away_score: null, possession: null, red_zone: null }))
  expect(parts).toEqual({ clock: '—', score: 'TB —–— ATL', field: null, redZone: false })
})

it('reads the opponent from the player team', () => {
  expect(opponentText(block(), 'ATL')).toBe('vs TB')
  expect(opponentText(block(), 'TB')).toBe('@ ATL')
  expect(opponentText(block(), 'GB')).toBeNull()
  expect(opponentText(block({ home_abbr: null }), 'TB')).toBeNull()
})

it('writes the final result from the player side', () => {
  const final = block({ status: 'final', home_score: 31, away_score: 20, home_abbr: 'BUF', away_abbr: 'MIA' })
  expect(finalResultText(final, 'BUF')).toBe('W 31–20 vs MIA')
  expect(finalResultText(final, 'MIA')).toBe('L 20–31 @ BUF')
  expect(finalResultText(final, 'KC')).toBeNull()
  expect(finalResultText(block({ home_score: null }), 'ATL')).toBeNull()
})

it('formats a kickoff and ignores a bad one', () => {
  expect(kickoffText('2026-11-29T21:25:00Z')).toMatch(/^[A-Z][a-z]{2} \d{1,2}:25 [AP]M$/)
  expect(kickoffText(null)).toBeNull()
  expect(kickoffText('nope')).toBeNull()
})

it('summarises offensive stats and skips empty ones', () => {
  expect(statLineText({ passYd: 281, passTD: 2, rushYd: 41 })).toBe('281 pass yds 2 TD · 41 rush yds')
  expect(statLineText({ rec: 5, recYd: 64, recTD: 1, fumLost: 1 })).toBe('5 rec 64 yds 1 TD · 1 fum lost')
  expect(statLineText({ sacks: 3 })).toBe('')
  expect(statLineText(null)).toBe('')
})

it('falls back to neutral text when the player team is unknown', () => {
  const final = block({ status: 'final', home_score: 31, away_score: 20, home_abbr: 'BUF', away_abbr: 'MIA' })
  expect(finalLineText(final, undefined)).toBe('MIA 20–31 BUF')
  expect(finalLineText(final, 'BUF')).toBe('W 31–20 vs MIA')
  expect(finalLineText(block({ status: 'final', home_score: null }), undefined)).toBeNull()
  expect(matchupText(final)).toBe('MIA @ BUF')
  expect(matchupText(block({ away_abbr: null }))).toBeNull()
})

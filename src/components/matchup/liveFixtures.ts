import type { FeedItem, GameStatus, LiveBlock, MatchupFeedResponse, MatchupResponse, PlayerLine } from '../../api/types'
import { matchupFixture } from './fixtures'

export type LiveScenario = 'sunday' | 'preGame' | 'final'

interface GameSpec { away: string; home: string; awayScore: number; homeScore: number; period: number | null; clock: string | null; status: GameStatus }

const GAMES: Record<LiveScenario, Record<string, GameSpec>> = {
  sunday: {
    tbAtl: { away: 'TB', home: 'ATL', awayScore: 14, homeScore: 17, period: 3, clock: '8:42', status: 'in_progress' },
    miaBuf: { away: 'MIA', home: 'BUF', awayScore: 20, homeScore: 31, period: 4, clock: '0:00', status: 'final' },
    gbDet: { away: 'GB', home: 'DET', awayScore: 0, homeScore: 0, period: null, clock: null, status: 'not_started' },
  },
  preGame: { gbDet: { away: 'GB', home: 'DET', awayScore: 0, homeScore: 0, period: null, clock: null, status: 'not_started' } },
  final: { miaBuf: { away: 'MIA', home: 'BUF', awayScore: 20, homeScore: 31, period: 4, clock: '0:00', status: 'final' } },
}

// Which game each starter plays in; a5 has a bye, and starters not listed have no snapshot.
const ASSIGNMENT: Record<LiveScenario, Record<string, string>> = {
  sunday: { a1: 'tbAtl', a2: 'tbAtl', a3: 'miaBuf', a4: 'miaBuf', a6: 'gbDet', c1: 'miaBuf', c2: 'gbDet', c3: 'gbDet', c4: 'tbAtl', c5: 'tbAtl' },
  preGame: { a1: 'gbDet', a2: 'gbDet', a3: 'gbDet', a4: 'gbDet', a6: 'gbDet', c1: 'gbDet', c2: 'gbDet', c3: 'gbDet', c4: 'gbDet', c5: 'gbDet' },
  final: { a1: 'miaBuf', a2: 'miaBuf', a3: 'miaBuf', a4: 'miaBuf', a6: 'miaBuf', c1: 'miaBuf', c2: 'miaBuf', c3: 'miaBuf', c4: 'miaBuf', c5: 'miaBuf' },
}

function liveBlock(game: GameSpec, points: number | null, updatedAt: string): LiveBlock {
  return {
    status: game.status, period: game.period, clock: game.clock,
    home_abbr: game.home, home_score: game.homeScore, away_abbr: game.away, away_score: game.awayScore,
    possession: game.status === 'in_progress' ? game.home : null, yard_line: null, red_zone: null,
    stat_line: null, live_points: game.status === 'not_started' ? null : points, updated_at: updatedAt,
  }
}

function withLive(line: PlayerLine, game: GameSpec | undefined, updatedAt: string): PlayerLine {
  if (!game) return line.player_id === 'a5' ? { ...line, game_status: null, bye_week: 7, live: null } : line
  return { ...line, game_status: game.status, live: liveBlock(game, line.points, updatedAt) }
}

/** The week-7 matchup with live snapshots. 'sunday' has a game under way, one final, one not
 * started, and a starter on a bye. */
export function liveMatchupFixture(scenario: LiveScenario, updatedAt: string = new Date().toISOString()): MatchupResponse {
  const matchup = matchupFixture()
  const games = GAMES[scenario]
  const decorate = (lines: PlayerLine[]) =>
    lines.map((line) => withLive(line, games[ASSIGNMENT[scenario][line.player_id]], updatedAt))
  matchup.our_team.starters = decorate(matchup.our_team.starters)
  matchup.opponent.starters = decorate(matchup.opponent.starters)
  if (scenario === 'sunday') {
    matchup.our_team.team.win_probability = 0.64
    matchup.opponent.team.win_probability = 0.36
  }
  return matchup
}

function play(n: number, side: 'mine' | 'theirs', name: string, text: string, label: string, clock: string, delta: number | null, scoring = false): FeedItem {
  return {
    type: 'play', cursor: `play-${n}`, at: `2026-10-18T17:${String(60 - n).padStart(2, '0')}:00Z`, player_id: `p${n}`, espn_id: null,
    player_name: name, position: null, team: null, side, play_id: `${n}`, event_id: 'e1', game_label: label,
    period: 3, clock, text, scoring, fantasy_delta: delta,
  }
}

function news(side: 'mine' | 'theirs', name: string, headline: string): FeedItem {
  return {
    type: 'news', cursor: `news-${name}`, at: '2026-10-18T17:20:00Z', player_id: `n-${name}`, espn_id: null, player_name: name,
    position: null, team: null, side, news_id: 1, source: 'ESPN', headline, url: null,
  }
}

const SUNDAY_FEED: FeedItem[] = [
  play(1, 'mine', 'Sample Runner A', '12-yd run to TB 12', 'TB 14 – 17 ATL', '8:42', 1.2),
  play(2, 'theirs', 'Rival Receiver A', '24-yd TD reception', 'TB 14 – 17 ATL', '9:15', 8.4, true),
  news('theirs', 'Rival Receiver B', 'Questionable to return with an ankle injury, per ESPN'),
  play(3, 'mine', 'Sample Receiver A', 'Fumble, recovered by BUF', 'MIA 20 – 31 BUF', '2:11', -2),
  play(4, 'mine', 'Sample Runner A', '3-yd TD run', 'TB 14 – 17 ATL', '6:20', 6.3, true),
  play(5, 'theirs', 'Rival Quarterback', '18-yd pass', 'MIA 20 – 31 BUF', '0:31', null),
]

export function liveFeedFixture(scenario: LiveScenario): MatchupFeedResponse {
  if (scenario === 'preGame') return { items: [], next_before: null }
  if (scenario === 'final') return { items: SUNDAY_FEED.filter((item) => item.type === 'news' || item.game_label?.startsWith('MIA')), next_before: null }
  return { items: SUNDAY_FEED, next_before: null }
}

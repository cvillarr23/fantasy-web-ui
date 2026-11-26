import type { FeedItem, GameDetailResponse, GamePlayer, LiveGame, ScoreBreakdownLine } from '../../api/types'

export type GameScenario = 'live' | 'final' | 'preGame'

function game(overrides: Partial<LiveGame>): LiveGame {
  return {
    event_id: 'evt-1', status: 'in_progress', detail: '3rd 8:42', period: 3, clock: '8:42',
    away: { abbr: 'TB', score: 14 }, home: { abbr: 'ATL', score: 17 },
    possession: 'ATL', yard_line: 'TB 12', red_zone: true,
    kickoff: '2026-10-18T17:00:00Z', updated_at: '2026-10-18T18:40:00Z', game_label: 'TB 14 – 17 ATL',
    ...overrides,
  }
}

const GAMES: Record<GameScenario, LiveGame> = {
  live: game({}),
  final: game({
    status: 'final', detail: 'Final', period: 4, clock: null, possession: null, yard_line: null, red_zone: false,
    away: { abbr: 'TB', score: 20 }, home: { abbr: 'ATL', score: 31 }, game_label: 'TB 20 – 31 ATL',
  }),
  preGame: game({
    status: 'not_started', detail: 'Sun 1:00 PM', period: null, clock: null, possession: null, yard_line: null,
    red_zone: false, away: { abbr: 'TB', score: null }, home: { abbr: 'ATL', score: null }, game_label: 'TB @ ATL',
  }),
}

function line(stat_key: string, label: string, qty: number, unit: string, rule_label: string, points: number): ScoreBreakdownLine {
  return { stat_key, label, qty, unit, rule_label, points }
}

const PLAYERS: GamePlayer[] = [
  {
    player_id: 'p1', espn_id: '1', player_name: 'Sample Runner A', position: 'RB', team: 'ATL', side: 'mine',
    slot: 'RB', starter: true, live_points: 18.6, projected_points: 14.8,
    stat_line: { rushYd: 96, rushTD: 1, rec: 2, recYd: 10 },
    breakdown: [
      line('rushingYards', 'Rushing yards', 96, 'yds', '1 pt per 10 rushing yds', 9.6),
      line('rushingTouchdowns', 'Rushing TD', 1, 'TD', '6 pts per rushing TD', 6),
      line('receivingReceptions', 'Receptions', 2, 'rec', '1 pt per reception', 2),
      line('receivingYards', 'Receiving yards', 10, 'yds', '1 pt per 10 receiving yds', 1),
    ],
  },
  {
    player_id: 'p9', espn_id: '9', player_name: 'Sample Receiver D', position: 'WR', team: 'TB', side: 'mine',
    slot: 'BE', starter: false, live_points: 4.3, projected_points: 8.8, stat_line: { rec: 2, recYd: 23 },
    breakdown: [
      line('receivingReceptions', 'Receptions', 2, 'rec', '1 pt per reception', 2),
      line('receivingYards', 'Receiving yards', 23, 'yds', '1 pt per 10 receiving yds', 2.3),
    ],
  },
  {
    player_id: 'p2', espn_id: '2', player_name: 'Rival Receiver A', position: 'WR', team: 'TB', side: 'theirs',
    slot: 'WR', starter: true, live_points: 6.2, projected_points: 14, stat_line: { rec: 2, recYd: 42, fumLost: 1 },
    breakdown: [
      line('receivingReceptions', 'Receptions', 2, 'rec', '1 pt per reception', 2),
      line('receivingYards', 'Receiving yards', 42, 'yds', '1 pt per 10 receiving yds', 4.2),
    ],
  },
]

function play(n: number, player: GamePlayer, text: string, clock: string, delta: number | null, scoring = false): FeedItem {
  return {
    type: 'play', cursor: `play:evt-1:${n}:${player.player_id}`, at: `2026-10-18T18:${String(40 - n).padStart(2, '0')}:00Z`,
    player_id: player.player_id, espn_id: player.espn_id, player_name: player.player_name, position: player.position,
    team: player.team, side: player.side, play_id: String(n), event_id: 'evt-1', game_label: 'TB 14 – 17 ATL',
    period: 3, clock, text, scoring, fantasy_delta: delta,
  }
}

const PLAYS: FeedItem[] = [
  play(1, PLAYERS[0], '12-yd run to TB 12', '8:42', 1.2),
  play(2, PLAYERS[2], '24-yd reception', '9:15', 3.4),
  play(3, PLAYERS[0], '3-yd TD run', '12:20', 6.3, true),
]

function notStarted(player: GamePlayer): GamePlayer {
  return { ...player, live_points: null, stat_line: null, breakdown: null }
}

/** GET /v1/matchup/games/evt-1 for a game under way, finished, or yet to kick off. */
export function gameFixture(scenario: GameScenario): GameDetailResponse {
  const before = scenario === 'preGame'
  return structuredClone({
    season: 2026,
    week: 7,
    game: GAMES[scenario],
    mine_points: before ? null : 18.6,
    theirs_points: before ? null : 6.2,
    players: before ? PLAYERS.map(notStarted) : PLAYERS,
    plays: before ? [] : PLAYS,
  })
}

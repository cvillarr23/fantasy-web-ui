import type { DraftConfig, MatchupResponse, PlayerLine } from '../../api/types'

export const matchupConfig: DraftConfig = { league_id: '123', team_id: '7', season: 2026, mode: 'live' }

function line(id: string, slot: string, position: string, name: string, points: number | null, projected: number | null): PlayerLine {
  return {
    player_id: id, espn_id: `espn-${id}`, name, position, jersey: null, slot, points, projected_points: projected,
    headshot_url: '', deficit_flag: false, suggested_swap: null,
  }
}

/** Synthetic week-7 matchup. Kickers and defenses have not played (null or 0.0 actuals), and
 * Sample Receiver B is projected for 0.0. */
export function matchupFixture(): MatchupResponse {
  return {
    season: 2026,
    week: 7,
    our_team: {
      team: { name: 'Gridiron Gang', logo_url: '', score: 62.4, projected: 118.2 },
      starters: [
        line('a1', 'QB', 'QB', 'Sample Quarterback', 24.6, 21.3),
        line('a2', 'RB', 'RB', 'Sample Runner A', 11.2, 14.8),
        line('a3', 'RB', 'RB', 'Sample Runner B', 8.4, 12.1),
        line('a4', 'WR', 'WR', 'Sample Receiver A', 9.5, 15.2),
        line('a5', 'WR', 'WR', 'Sample Receiver B', null, 0),
        line('a6', 'TE', 'TE', 'Sample Tight End', 4.1, 8.3),
        line('a7', 'FLEX', 'WR', 'Sample Receiver C', 4.6, 10.9),
        line('a8', 'K', 'K', 'Sample Kicker', 0, 8.1),
        line('a9', 'D/ST', 'D/ST', 'Sample Defense', 0, 7.4),
      ],
      bench: [
        line('b1', 'BE', 'RB', 'Sample Runner C', null, 9.2),
        line('b2', 'BE', 'WR', 'Sample Receiver D', 6.3, 8.8),
        line('b3', 'BE', 'QB', 'Sample Quarterback B', null, 15.6),
        line('b4', 'BE', 'TE', 'Sample Tight End B', 2.1, 5.4),
      ],
    },
    opponent: {
      team: { name: 'Waiver Wolves', logo_url: '', score: 48.1, projected: 109.6 },
      starters: [
        line('c1', 'QB', 'QB', 'Rival Quarterback', 17.8, 20.4),
        line('c2', 'RB', 'RB', 'Rival Runner A', 12.9, 15.5),
        line('c3', 'RB', 'RB', 'Rival Runner B', 6.2, 10.3),
        line('c4', 'WR', 'WR', 'Rival Receiver A', 7.1, 14),
        line('c5', 'WR', 'WR', 'Rival Receiver B', 2.4, 10.6),
        line('c6', 'TE', 'TE', 'Rival Tight End', 1.7, 7.2),
        line('c7', 'FLEX', 'RB', 'Rival Runner C', null, 9.8),
        line('c8', 'K', 'K', 'Rival Kicker', 0, 7.7),
        line('c9', 'D/ST', 'D/ST', 'Rival Defense', 0, 13.9),
      ],
      bench: [
        line('d1', 'BE', 'WR', 'Rival Receiver C', 5, 9.1),
        line('d2', 'BE', 'RB', 'Rival Runner D', null, 7.5),
        line('d3', 'BE', 'TE', 'Rival Tight End B', 0, 0),
      ],
    },
  }
}

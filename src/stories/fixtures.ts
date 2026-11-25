import { palette } from '../theme'
import type { EspnOwnership, NewsItem, PlayerSearchResult, PlayerSummary } from '../api/types'
import type { PlayerCardData } from '../components/player/PlayerCard'

// Synthetic players for stories. Names and IDs are made up; never use real league,
// team or member data here, because the component library is published.

/** An inline SVG so stories never load a remote headshot. */
export const headshot =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="16" fill="${palette.border}"/><circle cx="16" cy="12" r="6" fill="${palette.secondary}"/><rect x="6" y="20" width="20" height="10" rx="5" fill="${palette.secondary}"/></svg>`,
  )

export const brokenHeadshot = '/story-missing-headshot.png'

/** A starter ESPN managers trust: high start%, rising. */
export const espnStarter: EspnOwnership = {
  pos_rank: 12,
  percent_owned: 92,
  percent_started: 78,
  percent_bench: 14,
  percent_change: 3,
}

/** Under the 25% start threshold, so the line takes the cold style. */
export const espnCold: EspnOwnership = {
  pos_rank: 41,
  percent_owned: 24,
  percent_started: 6,
  percent_bench: 18,
  percent_change: -4,
}

export const samplePlayer: PlayerCardData = {
  id: '9001',
  name: 'Sample Quarterback',
  position: 'QB',
  team: 'KC',
  headshotUrl: headshot,
  jersey: 12,
  espn: espnStarter,
}

export const searchResults: PlayerSearchResult[] = [
  { player_id: 'p9001', espn_id: '9001', name: 'Sample Quarterback', position: 'QB', team: 'KC', injury_status: null, vorp_score: 8.4, projected_points: 21.2, espn: espnStarter },
  { player_id: 'p9002', espn_id: '9002', name: 'Sample Runner', position: 'RB', team: 'SF', injury_status: 'QUESTIONABLE', vorp_score: 5.1, projected_points: 14.9, espn: espnCold },
  { player_id: 'p9003', espn_id: null, name: 'Sample Receiver', position: 'WR', team: 'BUF', injury_status: null, vorp_score: null, projected_points: null },
]

export const playerSummary: PlayerSummary = {
  player_id: 'p9002',
  name: 'Sample Runner',
  position: 'RB',
  team: 'SF',
  status: 'ACTIVE',
  injury_status: 'QUESTIONABLE',
  recent_news: [
    { source: 'Fixture wire', raw_text: 'Limited in Wednesday practice with an ankle issue.', url: null, published_at: '2026-10-07T12:00:00Z' },
    { source: 'Fixture wire', raw_text: 'Expected to play through it this week.', url: 'https://example.com/news', published_at: null },
  ],
}

export const playerNews: NewsItem[] = [
  { id: 3, player_id: 'p9002', source: 'bluesky', author: 'Beat reporter', headline: 'Runner was a full participant at Friday practice and says he feels great.', url: 'https://example.com/post', published_at: '2026-10-07T11:00:00Z', score: null, also_reported_by: [] },
  { id: 2, player_id: 'p9002', source: 'espn_news', author: null, headline: 'Runner is listed questionable; the coach expects him to play.', url: 'https://example.com/espn', published_at: '2026-10-07T09:00:00Z', score: null, also_reported_by: ['rotowire', 'reddit'] },
  { id: 1, player_id: 'p9002', source: 'rotowire', author: 'RotoWire', headline: 'Runner (ankle) upgraded to full practice.', url: null, published_at: '2026-10-06T09:00:00Z', score: null, also_reported_by: [] },
]

/** A player summary once core serves the live block and the scoring breakdown. */
export const playerSummaryLive: PlayerSummary = {
  ...playerSummary,
  live: {
    live_points: 14.4,
    projected_points: 16,
    game_label: 'SF 20 – 14 SEA',
    game_status: 'in_progress',
    event_id: 'evt-1',
    breakdown: [
      { stat_key: 'rushYd', label: 'Rushing yards', qty: 78, rule_label: '1 pt per 10 yds', points: 7.8 },
      { stat_key: 'rushTD', label: 'Rushing TD', qty: 1, rule_label: '6 pts per TD', points: 6 },
      { stat_key: 'fumLost', label: 'Fumble lost', qty: 1, rule_label: '−2 pts per fumble lost', points: -2 },
    ],
  },
  season_avg: 16.9,
  weekly_log: [
    { week: 8, points: 21 }, { week: 9, points: 9.6 }, { week: 10, points: 18.3 }, { week: 11, points: 14.4 },
  ],
  espn: { pos_rank: 7, percent_owned: 98, percent_started: 90, percent_bench: 8, percent_change: 0.4 },
}

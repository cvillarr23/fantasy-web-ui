import { palette } from '../theme'
import type { EspnOwnership, PlayerSearchResult, PlayerSummary } from '../api/types'
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

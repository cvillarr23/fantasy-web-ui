// Mirrors the Pydantic models in fantasy-core-pipeline's src/api/draft.py and
// src/api/players.py. Keep these in sync by hand - there's no shared schema generation
// between the two repos yet.

export interface DraftPickSummary {
  pick_number: number
  round: number | null
  team_id: string
  /** Internal (Sleeper) id. Null when the ESPN->internal crosswalk has no entry for this
   * player, which is always the case for K and D/ST. */
  player_id: string | null
  /** ESPN's own id, always present - the only identifier a pick is guaranteed to have. */
  espn_player_id: string | null
  name: string | null
  position: string | null
}

export interface RankedCandidate {
  player_id: string
  name: string
  position: string
  vorp_score: number
  team: string
}

export interface DraftRecommendation {
  recommended_player_id?: string
  recommended_name?: string
  pick_number?: string
  top_candidates?: RankedCandidate[]
}

export interface DraftStatusError {
  [key: string]: unknown
}

export interface DraftStatusResponse {
  league_id: string
  season: number
  mode: 'live' | 'practice'
  job_state: 'Active' | 'Succeeded' | 'Failed' | 'Unknown'
  recommendation: DraftRecommendation
  last_clicker_action: string | null
  recent_picks: DraftPickSummary[]
  on_the_clock_team_id: string | null
  pipeline_health: 'healthy' | 'degraded'
  recent_errors: DraftStatusError[]
  listener_state: 'Active' | 'Starting' | 'Failed' | 'Unknown'
  listener_last_event_at: string | null
  listener_error: string | null
}

export interface RecentNewsItem {
  source: string
  raw_text: string
  url: string | null
  published_at: string | null
}

export interface PlayerSummary {
  player_id: string
  name: string
  position: string
  team: string
  status: string
  injury_status: string | null
  recent_news: RecentNewsItem[]
}

export interface PlayerSearchResult {
  player_id: string
  name: string
  position: string
  team: string
  injury_status: string | null
  vorp_score: number | null
  projected_points: number | null
}

export interface DraftConfig {
  league_id: string
  team_id: string
  season: number
  mode: 'live' | 'practice'
}

export interface PracticeSyncJobStatus {
  job_state: 'Active' | 'Succeeded' | 'Failed' | 'Unknown'
  room_connected: boolean
}

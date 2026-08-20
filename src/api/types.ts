// Mirrors the Pydantic models in fantasy-core-pipeline's src/api/draft.py and
// src/api/players.py. Keep these in sync by hand - there's no shared schema generation
// between the two repos yet.

export interface DraftPickSummary {
  pick_number: number
  round: number | null
  team_id: string
  player_id: string
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

export interface DraftStatusResponse {
  league_id: string
  season: number
  job_state: 'Active' | 'Succeeded' | 'Failed' | 'Unknown'
  recommendation: DraftRecommendation
  last_clicker_action: string | null
  recent_picks: DraftPickSummary[]
  on_the_clock_team_id: string | null
  pipeline_health: 'healthy' | 'degraded'
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
}

export interface DraftConfig {
  league_id: string
  team_id: string
  season: number
}

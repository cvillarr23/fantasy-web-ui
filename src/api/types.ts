// Mirrors the Pydantic models in fantasy-core-pipeline's src/api/draft.py and
// src/api/players.py. Keep these in sync by hand - there's no shared schema generation
// between the two repos yet.

export interface DraftPickSummary {
  pick_number: number
  round: number | null
  team_id: string
  /** Internal (Sleeper) id. Null when the ESPN->internal crosswalk has no entry for this
   * player. */
  player_id: string | null
  /** ESPN's own id, as it arrived on the draft stream. Null only on picks recorded before
   * this column existed; every pick written since carries one, and it is the only identifier
   * a pick with no crosswalk entry has at all. */
  espn_player_id: string | null
  name: string | null
  position: string | null
}

export interface RankedCandidate {
  player_id: string
  // ESPN's id, from the DynastyProcess crosswalk. Null for the ~18% of players it doesn't
  // cover. trigger-draft-pick requires this one - the
  // browser worker clicks button.Button--draft[data-player-id=...] in the ESPN room - and
  // the two id spaces overlap numerically, so player_id must never be substituted.
  espn_id: string | null
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
  /** Epoch seconds our own system will auto-publish this pick. Absent until a publish is
   * scheduled, and wiped entirely if the listener Job doesn't exist. */
  auto_publish_at?: number
  /** Epoch seconds ESPN's own pick clock expires - the real deadline, since pausing our
   * publisher does not pause ESPN's clock. Same absence rules as auto_publish_at. */
  pick_clock_expires_at?: number
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
  // See RankedCandidate.espn_id - null means this player cannot be drafted through the
  // click bot, and the UI must say so rather than fall back to player_id.
  espn_id: string | null
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

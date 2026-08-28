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
  /** Player's most recent weekly_stats row - a CURRENT pipeline value, not a snapshot frozen
   * at the moment this pick happened. Null if the player has no weekly_stats row at all. */
  vorp_score: number | null
  projected_points: number | null
  scarcity_multiplier: number | null
  matchup_coefficient: number | null
  /** Only meaningful for our own team's picks - null for every opponent pick, since the
   * concept doesn't apply to picks our system never attempted. true means our system's
   * attempted pick was never confirmed/matched and ESPN autodrafted for us instead; false
   * means our attempted pick landed as intended. */
  was_autodrafted: boolean | null
}

export interface TeamAggregate {
  /** Sum of vorp_score across this team's drafted players - a CURRENT snapshot recomputed
   * on every status refresh, not a running total frozen pick-by-pick. */
  total_vorp: number
  total_projected_points: number
  /** Drafted player count per position, e.g. {"RB": 3, "WR": 4}. Players with no
   * players-table match (K/D-ST with no crosswalk entry) are omitted, not bucketed. */
  position_counts: Record<string, number>
  /** True if this team's single most recent pick landed well past the round its overall
   * VORP rank would predict - a "great value" signal, not a claim the pick was objectively
   * good. */
  most_recent_pick_value_alert: boolean
  most_recent_pick_vorp_rank: number | null
  most_recent_pick_expected_round: number | null
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
  /** ESPN's own suggested-next-pick, scraped by fantasy-browser-worker and joined against
   * our players/VORP data (issue #80). Absent (not null) whenever no scrape has landed yet,
   * the scrape was malformed, or the draft is complete - the API can't distinguish "not on
   * the clock" from "worker hasn't published" from this field alone. */
  espn_suggestion?: EspnSuggestion
}

export interface EspnSuggestion {
  /** Always present when this object exists at all. */
  espn_player_id: string
  /** Our internal id - null if players.espn_id has no match for this player. */
  player_id: string | null
  /** Null if both the crosswalk match and the worker's own pool lookup failed. */
  name: string | null
  position: string | null
  team: string | null
  /** Null if the player wasn't in the undrafted VORP pool - show the name, blank the score. */
  vorp_score: number | null
  /** ISO 8601 timestamp. */
  suggested_at: string | null
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
  /** Every team_id in the league, from draft_slots, in slot order - independent of who has
   * picked so far. Unlike team_rosters/team_aggregates (which only ever gain a key once a
   * team's first pick lands), this is the source of truth for rendering one comparison column
   * per team, including teams with zero picks. Empty if draft_slots hasn't synced yet. */
  team_ids: string[]
  /** All draft picks grouped by team_id for full-roster rendering, ordered by pick_number
   * ascending within each team. Unbounded, unlike recent_picks. */
  team_rosters: Record<string, DraftPickSummary[]>
  /** Per-team VORP/projected-points totals, position breakdown, and a value-pick alert for
   * that team's most recent pick - keyed by team_id, same keys as team_rosters. */
  team_aggregates: Record<string, TeamAggregate>
  on_the_clock_team_id: string | null
  pipeline_health: 'healthy' | 'degraded'
  recent_errors: DraftStatusError[]
  listener_state: 'Active' | 'Starting' | 'Failed' | 'Unknown'
  listener_last_event_at: string | null
  listener_error: string | null
  /** Manual + automatic (circuit-breaker) kill switch for this league's auto-publish.
   * False means the system will keep computing recommendations but will never call
   * /v1/trigger/draft-pick automatically - only a manual pick via InterventionControls
   * will submit anything. Part of issue #108. */
  auto_publish_enabled: boolean
  /** Why auto_publish_enabled is currently false; null whenever it's true or has never
   * been disabled. 'manual' means an operator used this toggle and it stays off until
   * they flip it back. 'circuit_breaker' means fantasy-core-pipeline's own failure
   * counter tripped it automatically - it self-heals on the next opponent pick event,
   * so this value can flip back to null on its own between two status polls with no
   * user action. */
  auto_publish_disabled_by: 'manual' | 'circuit_breaker' | null
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

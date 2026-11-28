// Mirrors the Pydantic models in fantasy-core-pipeline's src/api/draft.py and
// src/api/players.py. Keep these in sync by hand - there's no shared schema generation
// between the two repos yet.

export type EspnOwnership = {
  /** Positional rank among ESPN players at the player's position (1 = best). */
  pos_rank: number | null
  percent_owned: number | null
  percent_started: number | null
  percent_bench: number | null
  /** 24h change in percent_owned, in points. */
  percent_change: number | null
}

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
  /** ESPN's league-wide market signal; absent until core serves it. */
  espn?: EspnOwnership | null
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
  /** ESPN's league-wide market signal; absent until core serves it. */
  espn?: EspnOwnership | null
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
  /** ESPN's league-wide market signal; absent until core serves it. */
  espn?: EspnOwnership | null
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
  /** Team whose ESPN autodraft toggle is currently ON, from fantasy-browser-worker's live
   * AUTODRAFT WS frame - null if no team currently has it active or the signal hasn't been
   * seen yet. When this is our own team, ESPN fills that pick instantly regardless of our
   * own auto-publish clock - no hold delay can win that race (issue #108 follow-up,
   * confirmed live 2026-08-28, league 298899823). */
  autodraft_active_team_id: string | null
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

export type NewsSource = 'espn_news' | 'bluesky' | 'rotowire' | 'reddit'

/** One story from GET /v1/news, newest first. `also_reported_by` is set only when core
 * collapsed the same story from other sources into this one. */
export interface NewsItem {
  id: number
  player_id: string
  source: NewsSource
  author: string | null
  headline: string
  url: string | null
  published_at: string
  /** Reddit's score; null for every other source. */
  score: number | null
  also_reported_by: NewsSource[]
}

export interface NewsFeedResponse {
  items: NewsItem[]
}

/** One stat line of a player's fantasy points: qty x the league rule = points. `points` is
 * ESPN's own, so the lines sum to `live_points`; `stat_key: 'other'` carries any remainder
 * core can't itemize, with null `qty` and `unit`. */
export interface ScoreBreakdownLine {
  stat_key: string
  label: string
  /** Raw count (98 for 98 rushing yds; 1 for a range like "7–13 points allowed"). */
  qty: number | null
  /** What `qty` counts: `yds`, `TD`, `rec`...; null for a range stat and the other line. */
  unit: string | null
  /** The league rule in plain English, e.g. "1 pt per 10 rushing yds". */
  rule_label: string | null
  points: number
}

/** One league rule from GET /v1/scoring/rules: `points_per` points per unit of the stat, or,
 * for a range stat like "7–13 points allowed", once when it happens. */
export interface ScoringRule {
  stat_key: string
  label: string
  /** Passing, Rushing, Receiving, Turnovers, Kicking, Defense or Returns. */
  category: string
  points_per: number
  /** What the stat counts (`yds`, `TD`, `rec`...); null for a range stat. */
  unit: string | null
  /** Plain English, e.g. "1 pt per 10 rushing yds". */
  rule_label: string
  /** The one position the rule applies to; null when it applies to every player. */
  position: string | null
}

export interface ScoringRulesResponse {
  season: number
  rules: ScoringRule[]
}

export type GameStatus = 'not_started' | 'in_progress' | 'final'

/** The poller's live snapshot for one player (matchup lines and GET /v1/live/players); every
 * field is nullable, and the whole object is null when there is no snapshot. */
export interface LiveBlock {
  status: GameStatus | null
  period: number | null
  clock: string | null
  home_abbr: string | null
  home_score: number | null
  away_abbr: string | null
  away_score: number | null
  possession: string | null
  yard_line: string | null
  red_zone: boolean | null
  stat_line: Record<string, number> | null
  live_points: number | null
  updated_at: string | null
  /** The game's scheduled start, ISO-8601 UTC; null when ESPN sends none. */
  kickoff?: string | null
  /** Null when the player has no live points yet or core can't read the league's rules. */
  breakdown?: ScoreBreakdownLine[] | null
  /** Id of the NFL game, for a link to its details page; absent until core serves it here. */
  event_id?: string | null
}

export interface LivePlayersResponse {
  players: Record<string, LiveBlock | null>
}

/** One item of GET /v1/matchup/feed: a play, or news on a matchup player. */
export interface FeedItem {
  type: 'play' | 'news'
  cursor: string
  at: string | null
  player_id: string
  espn_id: string | null
  player_name: string | null
  position: string | null
  team: string | null
  side: 'mine' | 'theirs'
  play_id?: string | null
  event_id?: string | null
  game_label?: string | null
  period?: number | null
  clock?: string | null
  text?: string | null
  scoring?: boolean | null
  /** Null when core can't tell the points this play produced. */
  fantasy_delta?: number | null
  news_id?: number | null
  source?: string | null
  headline?: string | null
  url?: string | null
}

/** GET /v1/news/recent: whether each requested player has news from the last 24 hours. */
export interface RecentNewsResponse {
  has_news_24h: Record<string, boolean>
}

export interface MatchupFeedResponse {
  items: FeedItem[]
  next_before: string | null
}

export interface GameTeam {
  abbr: string | null
  /** Null before kickoff. */
  score: number | null
}

/** The poller's snapshot of one NFL game. */
export interface LiveGame {
  event_id: string
  status: GameStatus | null
  /** ESPN's short status, such as "3rd 8:42" or "Final". */
  detail: string | null
  period: number | null
  clock: string | null
  home: GameTeam
  away: GameTeam
  possession: string | null
  yard_line: string | null
  red_zone: boolean | null
  kickoff: string | null
  updated_at: string | null
  game_label: string | null
}

/** A matchup player, bench included, whose NFL team plays in the game. */
export interface GamePlayer {
  player_id: string
  espn_id: string | null
  player_name: string | null
  position: string | null
  team: string | null
  side: 'mine' | 'theirs'
  /** ESPN lineup slot name: `QB`, `RB/WR/TE`, `BE`, `IR`... */
  slot: string | null
  /** False for bench and IR, whose points don't count toward the matchup. */
  starter: boolean
  live_points: number | null
  projected_points: number | null
  stat_line: Record<string, number> | null
  breakdown: ScoreBreakdownLine[] | null
}

/** GET /v1/matchup/games/{event_id}. */
export interface GameDetailResponse {
  season: number
  week: number
  game: LiveGame
  /** Each side's starters' points from this game; null before kickoff. */
  mine_points: number | null
  theirs_points: number | null
  players: GamePlayer[]
  /** This game's plays, newest first. */
  plays: FeedItem[]
}

/** The player's game this week and the points it has produced. */
export interface PlayerLiveSummary {
  live_points: number | null
  projected_points: number | null
  game_label: string | null
  /** Core's values; null when the game is unknown. */
  game_status: GameStatus | null
  /** Id of the NFL game, for a link to its details page. */
  event_id?: string
  /** Null when the player has no live points yet or core can't read the league's rules. */
  breakdown?: ScoreBreakdownLine[] | null
}

export interface WeeklyPoints {
  week: number
  points: number | null
}

export interface PlayerSummary {
  player_id: string
  name: string
  position: string
  team: string
  status: string
  injury_status: string | null
  recent_news: RecentNewsItem[]
  /** Optional until core serves the live block. */
  live?: PlayerLiveSummary | null
  season_avg?: number | null
  /** The last 4 weeks of fantasy points, oldest first. */
  weekly_log?: WeeklyPoints[] | null
  espn?: EspnOwnership | null
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
  /** ESPN's league-wide market signal; absent until core serves it. */
  espn?: EspnOwnership | null
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

// Mirrors fantasy-core-pipeline's src/api/roster.py and src/api/routes.py
// (LineupTriggerPayload/SwapInstruction).

export interface RosterPositionDeficit {
  rostered: number
  starters_required: number
  deficit: number
  net_vorp: number
}

export interface RosterDeficitsResponse {
  season: number
  week: number
  roster_snapshot: string
  /** Keyed by team_id, then by position ('QB'/'RB'/'WR'/'TE' only - compute_roster_deficits
   * filters to SKILL_POSITIONS, no K or D/ST rows). Every team_id in league_rosters is
   * pre-seeded here even with zero players at a position, so there's no need for a separate
   * team_ids fallback list the way the draft-pick comparison panels need one. */
  teams: Record<string, Record<string, RosterPositionDeficit>>
}

// Mirrors fantasy-core-pipeline's src/api/matchup.py response models exactly.
export interface PlayerLine {
  /** ESPN's player id, the same as `espn_id`. */
  player_id: string
  espn_id: string
  /** Core's own player id, for the summary, news and live reads; null for a player core can't
   * match, absent for a core that doesn't serve it. */
  core_player_id?: string | null
  name: string
  position: string
  jersey: string | null
  slot: string
  /** The player's NFL team as an nflverse code, matching the live game's; null when ESPN gives no
   * team, absent for a core that doesn't serve it. */
  pro_team?: string | null
  // Null when ESPN has no value yet; the UI shows a dash, never zero.
  points: number | null
  projected_points: number | null
  // NFL bye week; null when core couldn't read the NFL schedule.
  bye_week?: number | null
  /** Where the player's NFL game stands; null on a bye, without a schedule, or for a stored week. */
  game_status?: GameStatus | null
  /** Core's live snapshot for this player; null or absent without one. */
  live?: LiveBlock | null
  headshot_url: string
  deficit_flag: boolean
  suggested_swap: { bench_for: string } | null
  /** ESPN's league-wide market signal; absent until core serves it. */
  espn?: EspnOwnership | null
}

export interface MatchupTeamInfo {
  name: string
  logo_url: string
  score: number
  projected: number | null
  /** ESPN's chance (0-1) this team wins; only sent for the week in progress. */
  win_probability?: number | null
}

export interface MatchupTeamSide {
  team: MatchupTeamInfo
  starters: PlayerLine[]
  bench: PlayerLine[]
}

export interface MatchupResponse {
  season: number
  week: number
  our_team: MatchupTeamSide
  opponent: MatchupTeamSide
}

// Mirrors fantasy-core-pipeline's GET /v1/matchup/scoreboard response models. Score-only
// (no starters/bench) - ESPN's own Scoreboard tab shows every matchup at once, not rosters.
export interface ScoreboardTeamInfo {
  team_id: string
  name: string
  logo_url: string
  score: number
  projected: number
}

export interface ScoreboardMatchup {
  home: ScoreboardTeamInfo | null
  away: ScoreboardTeamInfo | null
}

export interface ScoreboardResponse {
  season: number
  week: number
  matchups: ScoreboardMatchup[]
}

/** Benches drop_player_id and starts add_player_id in slot. kind is optional and callers
 * leave it out, so the payload stays identical to what the gateway accepted before IR moves. */
export interface LineupSwapMove {
  kind?: 'swap'
  drop_player_id: string
  add_player_id: string
  slot: string
}

/** Moves one player into or out of an IR slot. player_id is the ESPN id. The gateway rejects
 * internal ids, and the worker addresses ESPN directly. */
export type LineupIrMove =
  | { kind: 'ir'; player_id: string; player_name?: string; slot: 'IR' }
  | { kind: 'activate_ir'; player_id: string; player_name?: string; slot: 'BENCH' }

export type LineupSwapInstruction = LineupSwapMove | LineupIrMove

export interface IrSuggestion {
  action: 'move_to_ir' | 'activate_from_ir'
  reason: string
}

// Mirrors fantasy-core-pipeline's GET /v1/matchup/roster response models. Distinct from
// PlayerLine (used by /v1/matchup) - no points/projected_points, since this view isn't
// tied to a scoring period, it's "what's on my roster right now."
export interface LineupPlayerLine {
  /** ESPN's player id, the same as `espn_id`. */
  player_id: string
  espn_id: string
  /** Same meaning as PlayerLine.core_player_id. */
  core_player_id?: string | null
  name: string
  position: string
  jersey: string | null
  slot: string
  pro_team: string
  injury_status: string | null
  // NFL bye week; null when core couldn't read the NFL schedule.
  bye_week?: number | null
  headshot_url: string
  deficit_flag: boolean
  suggested_swap: { bench_for: string; add_player_id: string; explanation?: string | null } | null
  net_vorp: number | null
  /** This week's projected fantasy points; null when core has none. */
  projected_points?: number | null
  rumor_sentiment: string | null
  rumor_confidence: number | null
  rumor_suggested_action: string | null
  ir_suggestion?: IrSuggestion | null
  /** ESPN's league-wide market signal; absent until core serves it. */
  espn?: EspnOwnership | null
}

export interface LineupRosterResponse {
  ir_blocking_transactions?: boolean
  starters: LineupPlayerLine[]
  // Includes IR players, told apart by slot "IR".
  bench: LineupPlayerLine[]
  // The league's lineup shape keyed by slot label ("BE", "IR", ...); null or absent when the
  // league's settings aren't synced.
  lineup_slot_counts?: Record<string, number> | null
}

// Mirrors fantasy-core-pipeline's GET /v1/waiver/recommendations response models.
export interface WaiverPlayerSummary {
  espn_id: string | null
  name: string
  // The player's own default position, distinct from the recommended roster slot.
  position?: string | null
  pro_team: string
  injury_status: string | null
  // Per-week VORP averaged over the response's horizon_weeks (a bye week counts as replacement level).
  net_vorp: number
  // NFL bye week; null when core couldn't read the NFL schedule.
  bye_week?: number | null
  /** ESPN's league-wide market signal; absent until core serves it. */
  espn?: EspnOwnership | null
}

export interface WaiverLineupGain {
  week: number
  // Change to our best starting lineup's VORP that week; null when it can't be scored.
  delta: number | null
}

export interface WaiverRecommendation {
  // "add" fills an open roster slot (no drop), "swap" drops bench_player, "ir_and_add" moves
  // ir_player to IR before the add.
  kind?: 'add' | 'swap' | 'ir_and_add'
  ir_player?: WaiverPlayerSummary | null
  position: string
  vorp_delta: number
  free_agent: WaiverPlayerSummary
  bench_player?: WaiverPlayerSummary | null
  weekly_lineup_gains?: WaiverLineupGain[] | null
  horizon_lineup_gain?: number | null
  // Set on a recommend-only fill-in for a week where byes leave our lineup short.
  bye_fill?: { week: number; lineup_gain: number } | null
  rumor_sentiment: string | null
  rumor_confidence: number | null
  rumor_suggested_action: string | null
}

export interface WaiverIrMove {
  action: 'move_to_ir'
  position: string
  player: WaiverPlayerSummary
}

export interface WaiverRecommendationsResponse {
  open_roster_slots?: number
  open_ir_slots?: number
  ir_moves?: WaiverIrMove[]
  season: number
  week: number
  recommendations: WaiverRecommendation[]
  // Weeks every VORP value averages over; [week] when only one week is valued.
  horizon_weeks?: number[] | null
  // Weeks where NFL byes leave our best lineup short.
  bye_crunch_weeks?: number[]
}

// Mirrors fantasy-core-pipeline's GET /v1/waiver/free-agents response models.
export interface FreeAgentPlayer {
  player_id: string
  espn_id: string
  name: string
  position: string
  pro_team: string
  injury_status: string | null
  projected_points: number | null
  vorp_score: number | null
  // NFL bye week; null when core couldn't read the NFL schedule.
  bye_week?: number | null
  /** ESPN's league-wide market signal; absent until core serves it. */
  espn?: EspnOwnership | null
}

export interface FreeAgentEntry extends FreeAgentPlayer {
  // Our weakest bench player at this position, and the VORP gained by swapping them out.
  bench_player?: FreeAgentPlayer | null
  vorp_delta?: number | null
}

export type FreeAgentSort = 'vorp' | 'projected'

export interface FreeAgentsResponse {
  season: number
  week: number
  free_agents: FreeAgentEntry[]
  total: number
  limit: number
  offset: number
  // "rolling_prior_weeks" before the target week's projections land.
  source_mode?: 'target_week' | 'rolling_prior_weeks'
  source_weeks?: number[]
}

// Mirrors fantasy-core-pipeline's REST wrapper for evaluate_proposed_trade
// (POST /v1/trade/evaluate).
export interface TradeEvaluationResponse {
  incoming_total: number
  outgoing_total: number
  delta_vorp: number
  /** player_ids from the request that evaluate_proposed_trade couldn't resolve to a
   * weekly_stats row - their VORP is excluded from both totals, not treated as zero. */
  missing_player_ids: string[]
}

// Mirrors fantasy-core-pipeline's src/schemas/chat.py (POST /v1/chat/query). Read-only Q&A. Each
// answer is saved to an activity session; passing that session_id back makes the question a
// follow-up, and the backend includes the session's earlier questions and answers as context.
export interface ChatTradeProposal {
  incoming_player_ids: string[]
  outgoing_player_ids: string[]
}

export interface ChatQueryRequest {
  question: string
  season: number
  week: number
  team_id: string
  trade_proposal?: ChatTradeProposal
  session_id?: string
}

export interface ChatGrounding {
  roster_deficits: Record<string, unknown>
  /** Present only when the question implied a trade_proposal was evaluated; null otherwise. */
  trade_evaluation: Record<string, unknown> | null
}

export interface ChatQueryResponse {
  session_id?: string
  answer: string
  provider: string
  model: string
  latency_ms: number
  grounding: ChatGrounding
}

// Mirrors fantasy-core-pipeline's src/schemas/stats.py (GET /v1/stats/vorp). One row per
// player-week - there is no season-aggregate field, callers that need a season total sum
// vorp_score across weeks client-side.
export interface VorpStat {
  player_id: string
  name: string
  position: string
  team: string | null
  season: number
  week: number
  projected_points: number | null
  actual_points: number | null
  matchup_coefficient: number | null
  adjusted_projected_points: number | null
  vorp_base: number | null
  scarcity_multiplier: number | null
  defense_matchup_multiplier: number | null
  vorp_score: number | null
  /** ESPN's league-wide market signal; absent until core serves it. */
  espn?: EspnOwnership | null
}

// Mirrors fantasy-core-pipeline's backtest_results table, exposed via src/api/backtest.py
// (GET /v1/backtest/results, GET /v1/backtest/results/{season}).
export interface BacktestResultSummary {
  season: number
  run_at: string
  our_lineup_points: number
  optimal_lineup_points: number
  naive_baseline_points: number
  our_waiver_points: number
  no_moves_points: number
  our_draft_points: number
  pure_adp_draft_points: number
}

export interface BacktestWeekBreakdown {
  week: number
  our_lineup_points: number
  optimal_lineup_points: number
  naive_baseline_points: number
  our_waiver_points: number
  no_moves_points: number
}

export interface BacktestResultDetail extends BacktestResultSummary {
  summary_json: {
    weeks: BacktestWeekBreakdown[]
  }
}

/** Staged trades use ESPN identities, unlike the manual VORP evaluator's player IDs. */
export interface TradeOffer {
  id: number
  status: string
  league_id: string | null
  season: number | null
  executed_at: string
  offer_key?: string | null
  source?: string | null
  from_team_id?: string | null
  to_team_id?: string | null
  incoming_player_ids: string[]
  outgoing_player_ids: string[]
  incoming_players: { espn_id: string; name: string | null }[]
  outgoing_players: { espn_id: string; name: string | null }[]
  message?: string | null
  drafted_message?: string | null
  message_edited?: boolean
  edited_by?: string | null
  related_transaction_id?: string | null
  thread_root_id?: string | null
  approval?: { tracking_id?: string; approved_by?: string; approved_at?: string; publish_error?: string } | null
  /** Score evidence stored by the proposal generator. null means none was stored; absent means
   * the API didn't send the field, so whether evidence exists is unknown. Don't normalize one to the other. */
  evaluation?: import('./tradeScoreTypes').ProposalEvaluation | null
}

export interface TradeOfferList {
  offers: TradeOffer[]
  limit: number
  offset: number
}

export type { LeagueTradeContext, TradeContextTeam, TradeContextPlayer, FantasyScheduleWeek, ByeOutlook, ByeOutlookWeek, TeamByeOutlook } from './tradeContextTypes'
export type { TradeScore, TradeScoreRequest, TradeScoreLineupWeek, TradeScoreScheduleWeek, TradeScoreStarter, TradeScoreTeamImpact, ProposalEvaluation, TradeScoreByeCoverage, ScoringVersion, TradeScoreComponent, TradeScoreRestOfSeason, TradeScoreRestOfSeasonWeek, TradeScoreAcceptance } from './tradeScoreTypes'

import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { pollInterval } from '../components/matchup/matchupLive'
import { ApiError, getByeOutlook, getLineupRoster, getMatchup, getMatchupFeed, getRosterDeficits, getScoreboard } from './client'
import { queryClient } from './queryClient'
import type { DraftConfig, MatchupResponse } from './types'

// Week-scoped reads shared by several pages. Keys hold primitives only, so every page that
// asks for the same league/season/week hits one cache entry; invalidateRoster() matches them
// by their first segment.

function validWeek(week: number) {
  return Number.isInteger(week) && week > 0
}

export function rosterDeficitsQuery(config: DraftConfig, week: number) {
  return queryOptions({
    queryKey: ['roster-deficits', config.league_id, config.season, week],
    queryFn: () => getRosterDeficits(config.season, week),
    enabled: Boolean(config.league_id && config.team_id) && validWeek(week),
  })
}

function matchupKey(config: DraftConfig, week: number) {
  return ['matchup', config.league_id, config.team_id, config.season, week] as const
}

export function matchupQuery(config: DraftConfig, week: number) {
  return queryOptions({
    queryKey: matchupKey(config, week),
    // A 404 means no opponent this week (bye, or the season hasn't reached it). That is a
    // stable answer, so cache it as null instead of an error.
    queryFn: () =>
      getMatchup(config.season, week).catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) return null
        throw err
      }),
    enabled: Boolean(config.league_id && config.team_id) && validWeek(week),
    // Live scores move while a game is on; polling also tells core to poll ESPN faster.
    refetchInterval: (query) => pollInterval(query.state.data),
    refetchIntervalInBackground: false,
  })
}

/** Plays and news for the matchup's players. It polls on the same cadence as the matchup, read
 * from the matchup's cache entry, so both stop together when no game is in progress. */
export function matchupFeedQuery(config: DraftConfig, week: number) {
  return queryOptions({
    queryKey: ['matchup-feed', config.league_id, config.team_id, config.season, week],
    queryFn: () => getMatchupFeed(config.season, week),
    enabled: Boolean(config.league_id && config.team_id) && validWeek(week),
    refetchInterval: () => pollInterval(queryClient.getQueryData<MatchupResponse | null>(matchupKey(config, week))),
    refetchIntervalInBackground: false,
  })
}

export function scoreboardQuery(config: DraftConfig, week: number) {
  return queryOptions({
    queryKey: ['scoreboard', config.league_id, config.season, week],
    queryFn: () => getScoreboard(config.season, week),
    enabled: Boolean(config.league_id && config.team_id) && validWeek(week),
  })
}

export function lineupRosterQuery(config: DraftConfig, week: number | string) {
  const weekValue = Number(week) || 0
  return queryOptions({
    queryKey: ['lineup-roster', config.league_id, config.team_id, config.season, weekValue],
    queryFn: () => getLineupRoster(config.season, weekValue || undefined),
    enabled: Boolean(config.league_id && config.team_id),
    // Staged swaps are submitted against this roster, so every visit re-checks it in the
    // background (submit waits for it) while the cached copy renders immediately.
    refetchOnMount: 'always',
    // Keep the previous week's roster on screen while another week loads.
    placeholderData: keepPreviousData,
  })
}

export function byeOutlookQuery(config: DraftConfig, week: number) {
  return queryOptions({
    queryKey: ['bye-outlook', config.league_id, config.team_id, config.season, week],
    queryFn: () => getByeOutlook(config.season, week),
    enabled: Boolean(config.league_id && config.team_id) && validWeek(week),
    // Byes don't move; the lineup values behind a crunch only change with the daily refresh.
    staleTime: 10 * 60 * 1000,
  })
}

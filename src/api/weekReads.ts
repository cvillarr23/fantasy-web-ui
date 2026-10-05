import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { ApiError, getLineupRoster, getMatchup, getRosterDeficits, getScoreboard } from './client'
import type { DraftConfig } from './types'

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

export function matchupQuery(config: DraftConfig, week: number) {
  return queryOptions({
    queryKey: ['matchup', config.league_id, config.team_id, config.season, week],
    // A 404 means no opponent this week (bye, or the season hasn't reached it). That is a
    // stable answer, so cache it as null instead of an error.
    queryFn: () =>
      getMatchup(config.season, week).catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) return null
        throw err
      }),
    enabled: Boolean(config.league_id && config.team_id) && validWeek(week),
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

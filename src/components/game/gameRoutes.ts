export const SCORING_PATH = '/scoring'

/** The Game details page. `search` carries the selected week (`?week=7`); without it the page
 * follows the current week. */
export function gamePath(eventId: string, search = ''): string {
  return `/matchup/game/${encodeURIComponent(eventId)}${search}`
}

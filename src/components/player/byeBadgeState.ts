/** How a player's NFL bye relates to the week being viewed: on bye that week, coming up, or
 * nothing worth showing (already past, or unknown). */
export function byeBadgeState(byeWeek: number | null | undefined, week: number | null | undefined) {
  if (!byeWeek) return null
  if (!week) return 'upcoming'
  if (byeWeek === week) return 'this_week'
  return byeWeek > week ? 'upcoming' : null
}

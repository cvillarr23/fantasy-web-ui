export function contextNumber(value: number | null | undefined, digits = 1): string {
  return value == null ? 'Unknown' : value.toFixed(digits)
}

export function formatFantasyStrength(value: number | null | undefined): string {
  return value == null ? 'Unknown' : `${contextNumber(value, 2)} z`
}

export function tradeContextTeamName(
  context: import('../api/types').LeagueTradeContext, teamId: string,
): string {
  return context.teams[teamId]?.name || `Team ${teamId}`
}

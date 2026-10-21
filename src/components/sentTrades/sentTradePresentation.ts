export const outcomeColors = { waiting: 'yellow', countered: 'blue', accepted: 'teal', declined: 'red', not_sent: 'red' }
export const playerLabel = (player: { name: string | null; espn_id: string }) => player.name || `ESPN player ${player.espn_id}`

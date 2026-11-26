/** A matchup or roster line. Its `player_id` is ESPN's id, so anything that reads one player's
 * data from core goes by `core_player_id`, never falling back: the two id spaces overlap. */
interface IdentifiedLine {
  core_player_id?: string | null
}

export function corePlayerIds(lines: IdentifiedLine[]): string[] {
  return lines.flatMap((line) => (line.core_player_id ? [line.core_player_id] : []))
}

/** What opens this player's popover; undefined when core can't identify him. */
export function playerOpener(line: IdentifiedLine, open: ((playerId: string) => void) | undefined) {
  const id = line.core_player_id
  return id && open ? () => open(id) : undefined
}

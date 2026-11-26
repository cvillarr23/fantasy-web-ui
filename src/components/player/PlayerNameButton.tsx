/** A player's name as the keyboard-reachable control that opens their popover; plain text when
 * there is nothing to open. */
export function PlayerNameButton({ name, onOpen }: { name: string; onOpen?: () => void }) {
  if (!onOpen) return <>{name}</>
  return <button type="button" className="player-name-button" onClick={onOpen}>{name}</button>
}

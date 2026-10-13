import { Text } from '@mantine/core'

export interface TradeSidePlayer {
  espn_id: string
  name: string | null
}

interface Props {
  receive: TradeSidePlayer[]
  send: TradeSidePlayer[]
  /** Shown when ESPN didn't give a name. */
  fallbackName?: string
}

/** The exact players on each side of a trade, with ESPN IDs, for review before acting. */
export function PlayerSides({ receive, send, fallbackName = 'Unnamed player' }: Props) {
  return (
    <>
      {([['receive', receive], ['send', send]] as const).map(([side, players]) => (
        <div key={side}>
          <Text fw={600}>You {side}</Text>
          <ul>
            {players.map((p) => (
              <li key={p.espn_id}>
                {p.name || fallbackName} (ESPN {p.espn_id})
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}

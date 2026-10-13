import type { ReactNode } from 'react'
import { InjuryBadge } from './InjuryBadge'
import { RumorBadge } from './RumorBadge'

export interface PlayerStatusFields {
  injury_status: string | null
  rumor_sentiment: string | null
  rumor_confidence: number | null
  rumor_suggested_action: string | null
}

/** A player's injury and rumor badges. `extra` badges go between the two. */
export function PlayerStatusBadges({ player, extra }: { player: PlayerStatusFields; extra?: ReactNode }) {
  return (
    <>
      <InjuryBadge status={player.injury_status} />
      {extra}
      <RumorBadge
        sentiment={player.rumor_sentiment}
        confidence={player.rumor_confidence}
        suggestedAction={player.rumor_suggested_action}
      />
    </>
  )
}

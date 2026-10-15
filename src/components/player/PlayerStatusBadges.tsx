import type { ReactNode } from 'react'
import { ByeBadge } from './ByeBadge'
import { InjuryBadge } from './InjuryBadge'
import { RumorBadge } from './RumorBadge'

export interface PlayerStatusFields {
  injury_status: string | null
  rumor_sentiment: string | null
  rumor_confidence: number | null
  rumor_suggested_action: string | null
  bye_week?: number | null
}

/** A player's bye, injury and rumor badges. `extra` badges go between injury and rumor.
 * `week` is the week being viewed, so a bye in that week stands out. */
export function PlayerStatusBadges({ player, extra, week }: { player: PlayerStatusFields; extra?: ReactNode; week?: number | null }) {
  return (
    <>
      <ByeBadge byeWeek={player.bye_week} week={week} />
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

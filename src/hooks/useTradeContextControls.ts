import { useState } from 'react'
import type { DraftConfig } from '../api/types'

export interface TradeContextControls {
  counterpartyTeamId: string
  onCounterpartyTeamChange: (teamId: string) => void
  horizon: number
  onHorizonChange: (horizon: number) => void
}

export function useTradeContextControls(config: DraftConfig): TradeContextControls {
  const scope = `${config.league_id}:${config.season}:${config.team_id}`
  const [selection, setSelection] = useState({ scope: '', teamId: '' })
  const [horizon, setHorizon] = useState(4)
  return {
    counterpartyTeamId: selection.scope === scope && selection.teamId !== config.team_id ? selection.teamId : '',
    onCounterpartyTeamChange: (teamId) => setSelection({ scope, teamId }),
    horizon,
    onHorizonChange: setHorizon,
  }
}

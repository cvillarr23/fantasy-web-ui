import { useCallback, useState } from 'react'
import type { DraftConfig, PlayerSearchResult } from '../api/types'

import type { TradeCandidate } from '../api/tradeCandidateTypes'

export interface TradeBuilderDraft {
  revision: number
  week: number
  teamName: string
  incoming: PlayerSearchResult[]
  outgoing: PlayerSearchResult[]
}
export interface TradePrefill {
  candidate: TradeCandidate
  week: number
  horizon: number
}

export interface TradeContextControls {
  counterpartyTeamId: string
  onCounterpartyTeamChange: (teamId: string) => void
  horizon: number
  onHorizonChange: (horizon: number) => void
  builderDraft?: TradeBuilderDraft | null
  prefillTrade?: (prefill: TradePrefill) => void
}

export function useTradeContextControls(config: DraftConfig): TradeContextControls {
  const scope = `${config.league_id}:${config.season}:${config.team_id}`
  const [selection, setSelection] = useState({ scope: '', teamId: '' })
  const [horizon, setHorizon] = useState(4)
  const [draft, setDraft] = useState<{ scope: string; value: TradeBuilderDraft } | null>(null)
  const prefillTrade = useCallback(({ candidate, week, horizon }: TradePrefill) => {
    const player = (p: TradeCandidate['receive'][number]): PlayerSearchResult => ({
      player_id: p.player_id ?? '', espn_id: p.espn_id, name: p.name || p.espn_id,
      position: p.position ?? '', team: p.nfl_team ?? '', injury_status: null,
      vorp_score: p.vorp, projected_points: null,
    })
    setSelection({ scope, teamId: candidate.counterparty.team_id })
    setHorizon(horizon)
    setDraft((previous) => ({ scope, value: {
      revision: (previous?.value.revision ?? 0) + 1, week, teamName: candidate.counterparty.name,
      incoming: candidate.receive.map(player), outgoing: candidate.send.map(player),
    } }))
  }, [scope])
  return {
    builderDraft: draft?.scope === scope ? draft.value : null,
    prefillTrade,
    counterpartyTeamId: selection.scope === scope && selection.teamId !== config.team_id ? selection.teamId : '',
    onCounterpartyTeamChange: (teamId) => setSelection({ scope, teamId }),
    horizon,
    onHorizonChange: setHorizon,
  }
}

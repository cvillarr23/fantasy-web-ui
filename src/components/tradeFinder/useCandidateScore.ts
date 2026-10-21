import { useQuery } from '@tanstack/react-query'
import { scoreTrade } from '../../api/client'
import { queryClient } from '../../api/queryClient'
import type { DraftConfig } from '../../api/types'
import type { TradeCandidate } from '../../api/tradeCandidateTypes'

export interface CandidateEvidenceProps {
  candidate: TradeCandidate
  config: DraftConfig
  week: number
  horizon: number
  runId: string
}

export function useCandidateScore({ candidate, config, week, horizon, runId }: CandidateEvidenceProps, enabled: boolean) {
  const request = {
    league_id: config.league_id, season: config.season, week, horizon,
    our_team_id: config.team_id, counterparty_team_id: candidate.counterparty.team_id,
    send_espn_ids: candidate.send.map((p) => p.espn_id), receive_espn_ids: candidate.receive.map((p) => p.espn_id),
  }
  return useQuery({
    queryKey: ['trade-candidate-score', runId, request],
    queryFn: () => scoreTrade(request), enabled,
    staleTime: 60_000,
  }, queryClient)
}

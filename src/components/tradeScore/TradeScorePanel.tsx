import { Alert, Button, Group, NativeSelect, Stack, Text } from '@mantine/core'
import { useMutation } from '@tanstack/react-query'
import { ApiError, scoreTrade } from '../../api/client'
import { queryClient } from '../../api/queryClient'
import type { DraftConfig, PlayerSearchResult, TradeScoreRequest } from '../../api/types'
import { validWeek } from '../../hooks/useSelectedWeek'
import { useTradeContext } from '../../hooks/useTradeContext'
import type { TradeContextControls } from '../../hooks/useTradeContextControls'
import { OperationProgress } from '../skeletons'
import { TradeScoreBreakdown } from './TradeScoreBreakdown'
import { scoreInputSignature } from './tradeScoreFormat'

interface Props {
  config: DraftConfig
  week: number | string
  incoming: PlayerSearchResult[]
  outgoing: PlayerSearchResult[]
  controls: TradeContextControls
}

function errorMessage(error: Error): string {
  const status = error instanceof ApiError ? error.status : undefined
  if (status === 409) return `A player is not on the side that would send them; check the counterparty and current rosters. ${error.message}`
  if (status === 422) return `The scorer rejected the request: ${error.message}`
  if (status === 503) return 'Trade context is unavailable right now. Try again shortly.'
  if (status === 504) return 'ESPN timed out while loading rosters. Try again.'
  if (status === 502) return 'Could not reach ESPN to load rosters. Try again.'
  return `Could not score this trade: ${error.message}`
}

export function TradeScorePanel({ config, week, incoming, outgoing, controls }: Props) {
  const selectedWeek = validWeek(week)
  const { counterpartyTeamId, horizon } = controls
  // Shares the context panel's cached query, used here only for fantasy-opponent names.
  const context = useTradeContext(config, week, horizon)
  const teamNames = context.data
    ? Object.fromEntries(Object.values(context.data.teams).map((team) => [team.team_id, team.name]))
    : undefined

  const unmapped = [...incoming, ...outgoing].filter((p) => !p.espn_id)
  const blocker = selectedWeek === null ? 'Select a valid week to score this trade.'
    : !counterpartyTeamId ? 'Select a counterparty to score this trade.'
      : !incoming.length || !outgoing.length ? 'Add at least one player on each side to score this trade.'
        : unmapped.length ? `${unmapped.map((p) => p.name).join(', ')} ${unmapped.length === 1 ? 'has' : 'have'} no ESPN id, so this trade cannot be scored.`
          : null
  const request: TradeScoreRequest | null = blocker ? null : {
    league_id: config.league_id,
    season: config.season,
    week: selectedWeek!,
    horizon,
    our_team_id: config.team_id,
    counterparty_team_id: counterpartyTeamId,
    send_espn_ids: outgoing.map((p) => p.espn_id!),
    receive_espn_ids: incoming.map((p) => p.espn_id!),
  }

  const scoring = useMutation({ mutationFn: (body: TradeScoreRequest) => scoreTrade(body) }, queryClient)
  // A score belongs to the exact inputs it was computed for; any change hides it.
  const current = scoring.variables && request
    && scoreInputSignature(scoring.variables) === scoreInputSignature(request)

  return (
    <Stack gap="sm" mt="lg" component="section" aria-label="Schedule-aware trade score">
      <h3>Schedule-aware score</h3>
      <Text size="sm" c="dimmed">
        Scores both teams' best lineups over the {horizon}-week horizon, weighted by fantasy opponent strength.
        Choose a trading team and horizon, then score the players above.
      </Text>
      <Group align="end">
        <NativeSelect label="Trading with" value={counterpartyTeamId} data={[{ value: '', label: 'Select a counterparty' }, ...Object.entries(teamNames ?? {}).filter(([id]) => id !== config.team_id).map(([value, label]) => ({ value, label }))]}
          onChange={event => controls.onCounterpartyTeamChange(event.currentTarget.value)} />
        <NativeSelect label="Scoring horizon" value={horizon} data={Array.from({ length: 18 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} weeks` }))}
          onChange={event => controls.onHorizonChange(Number(event.currentTarget.value))} />
      </Group>
      <Group>
        <Button onClick={() => request && scoring.mutate(request)} disabled={!request} loading={scoring.isPending}>
          Score trade
        </Button>
      </Group>
      {blocker && <Text size="sm">{blocker}</Text>}
      {scoring.isPending && <OperationProgress label="Scoring trade" />}
      {!scoring.isPending && scoring.variables && !current && (
        <Text size="sm" c="dimmed">Inputs changed — score again to see a result for this trade.</Text>
      )}
      {current && scoring.isError && <Alert color="red" role="alert">{errorMessage(scoring.error)}</Alert>}
      {current && scoring.data && <><TradeScoreBreakdown score={scoring.data} teamNames={teamNames} builder /><Button disabled variant="default">Propose this trade (coming soon)</Button></>}
    </Stack>
  )
}

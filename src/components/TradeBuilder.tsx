import { Link } from 'react-router-dom'
import { WeekSelector } from './ui/WeekSelector'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../api/queryClient'
import { Alert, Button, Group, Text } from '@mantine/core'
import { RosterQuickActions } from './RosterQuickActions'
import { evaluateTrade } from '../api/client'
import { PlayerCard } from './player/PlayerCard'
import { PlayerPicker } from './PlayerPicker'
import { useToast } from '../hooks/useToast'
import { OperationProgress } from './skeletons'
import type { DraftConfig, PlayerSearchResult, TradeEvaluationResponse } from '../api/types'
import type { TradeContextControls } from '../hooks/useTradeContextControls'
import { TradeScorePanel } from './tradeScore/TradeScorePanel'
import { ToastLine } from './ui/ToastLine'

interface Props {
  config: DraftConfig
  /** Counterparty and horizon shared with the league trade context panel. */
  controls?: TradeContextControls
}

interface Side {
  label: string
  players: PlayerSearchResult[]
  add: (p: PlayerSearchResult) => void
  remove: (playerId: string) => void
}

function TradeSideColumn({ side }: { side: Side }) {
  const [picking, setPicking] = useState<PlayerSearchResult | null>(null)
  const alreadyAdded = picking !== null && side.players.some((p) => p.player_id === picking.player_id)

  function addPicked() {
    if (!picking || alreadyAdded) return
    side.add(picking)
    setPicking(null)
  }

  return (
    <div className="trade-side-column">
      <Text size="sm" fw={500}>{side.label}</Text>
      <div className="trade-side-add-row">
        <PlayerPicker selected={picking} onSelect={setPicking} onClear={() => setPicking(null)} />
        <Button size="xs" onClick={addPicked} disabled={!picking || alreadyAdded}>Add</Button>
      </div>
      {side.players.length > 0 && (
        <ul className="trade-side-list">
          {side.players.map((p) => (
            <li key={p.player_id}>
              <PlayerCard variant="row" player={{ id: p.player_id, name: p.name, position: p.position, team: p.team }} />
              <Button variant="subtle" size="xs" onClick={() => side.remove(p.player_id)}>✕</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function TradeBuilder({ config, controls }: Props) {
  const [incoming, setIncoming] = useState<PlayerSearchResult[]>([])
  const [outgoing, setOutgoing] = useState<PlayerSearchResult[]>([])
  // number | string, same reasoning as LineupPage's week field - NumberInput passes
  // intermediate values that aren't a valid week yet.
  const [week, setWeek] = useSelectedWeek()
  const { toast, showToast } = useToast()
  const weekValue = Number(week)
  const validWeek = Number.isFinite(weekValue) && weekValue > 0
  const canEvaluate = validWeek && (incoming.length > 0 || outgoing.length > 0)

  const evaluation = useMutation({
    mutationFn: () =>
      evaluateTrade(
        incoming.map((p) => p.player_id),
        outgoing.map((p) => p.player_id),
        config.season,
        weekValue,
      ),
    onError: (err) => showToast('error', `Failed to evaluate trade: ${String(err)}`),
  }, queryClient)
  // Cleared while a new evaluation runs so an old verdict never reads as the new one.
  const result: TradeEvaluationResponse | undefined = evaluation.isPending ? undefined : evaluation.data

  function addTo(setter: typeof setIncoming) {
    return (p: PlayerSearchResult) => setter((prev) => [...prev, p])
  }
  function removeFrom(setter: typeof setIncoming) {
    return (playerId: string) => setter((prev) => prev.filter((p) => p.player_id !== playerId))
  }

  function submit() {
    evaluation.mutate()
  }

  return (
    <section className="trade-builder">
      <Group justify="space-between" mb="md">
        <h2>Evaluate a trade</h2>
        <RosterQuickActions page="trades" week={week} />
      </Group>
      <WeekSelector week={week} onChange={setWeek} />

      <div className="trade-columns">
        <TradeSideColumn
          side={{
            label: 'You receive',
            players: incoming,
            add: addTo(setIncoming),
            remove: removeFrom(setIncoming),
          }}
        />
        <TradeSideColumn
          side={{
            label: 'You send',
            players: outgoing,
            add: addTo(setOutgoing),
            remove: removeFrom(setOutgoing),
          }}
        />
      </div>

      <Group mt="md">
        <Button onClick={submit} loading={evaluation.isPending} disabled={!canEvaluate}>
          Compare VORP
        </Button>
        <Button
          component={Link}
          disabled={
            !validWeek || !incoming.length || [...incoming, ...outgoing].some((p) => !p.espn_id)
          }
          to={`/moves/review?${new URLSearchParams([['kind', 'trade'], ['week', String(week)], ...incoming.map((p) => ['add', p.espn_id ?? '']), ...outgoing.map((p) => ['drop', p.espn_id ?? ''])])}`}
        >
          Review roster impact
        </Button>
      </Group>

      {evaluation.isPending && <OperationProgress label="Comparing trade value" />}
      {result && (
        <div className="trade-result">
          <div className="trade-result-totals">
            <span>Receiving VORP: {result.incoming_total.toFixed(1)}</span>
            <span>Sending VORP: {result.outgoing_total.toFixed(1)}</span>
            <span className={result.delta_vorp >= 0 ? 'trade-delta-positive' : 'trade-delta-negative'}>
              Net VORP: {result.delta_vorp >= 0 ? '+' : ''}{result.delta_vorp.toFixed(1)}
            </span>
          </div>
          {result.missing_player_ids.length > 0 && (
            <Alert color="yellow" mt="sm">
              No VORP data for {result.missing_player_ids.length} player(s) - excluded from totals above.
            </Alert>
          )}
        </div>
      )}

      {controls && <TradeScorePanel config={config} week={week} incoming={incoming} outgoing={outgoing} controls={controls} />}

      <ToastLine toast={toast} />
    </section>
  )
}

import { Link } from 'react-router-dom'
import { WeekSelector } from './WeekSelector'
import { useSelectedWeek } from '../hooks/useSelectedWeek'
import { useState } from 'react'
import { Alert, Button, Group, Text } from '@mantine/core'
import { RosterQuickActions } from './RosterQuickActions'
import { evaluateTrade } from '../api/client'
import { PlayerCard } from './PlayerCard'
import { PlayerPicker } from './PlayerPicker'
import { useToast } from '../hooks/useToast'
import type { DraftConfig, PlayerSearchResult, TradeEvaluationResponse } from '../api/types'

interface Props {
  config: DraftConfig
}

interface Side {
  label: string
  players: PlayerSearchResult[]
  add: (p: PlayerSearchResult) => void
  remove: (playerId: string) => void
}

function TradeSideColumn({ side }: { side: Side }) {
  const [picking, setPicking] = useState<PlayerSearchResult | null>(null)
  const alreadyAdded =
    picking !== null && side.players.some((p) => p.player_id === picking.player_id)

  function addPicked() {
    if (!picking || alreadyAdded) return
    side.add(picking)
    setPicking(null)
  }

  return (
    <div className="trade-side-column">
      <Text size="sm" fw={500}>
        {side.label}
      </Text>
      <div className="trade-side-add-row">
        <PlayerPicker selected={picking} onSelect={setPicking} onClear={() => setPicking(null)} />
        <Button size="xs" onClick={addPicked} disabled={!picking || alreadyAdded}>
          Add
        </Button>
      </div>
      {side.players.length > 0 && (
        <ul className="trade-side-list">
          {side.players.map((p) => (
            <li key={p.player_id}>
              <PlayerCard
                variant="row"
                player={{ id: p.player_id, name: p.name, position: p.position, team: p.team }}
              />
              <Button variant="subtle" size="xs" onClick={() => side.remove(p.player_id)}>
                ✕
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function TradeBuilder({ config }: Props) {
  const [incoming, setIncoming] = useState<PlayerSearchResult[]>([])
  const [outgoing, setOutgoing] = useState<PlayerSearchResult[]>([])
  // number | string, same reasoning as LineupPage's week field - NumberInput passes
  // intermediate values that aren't a valid week yet.
  const [week, setWeek] = useSelectedWeek()
  const [result, setResult] = useState<TradeEvaluationResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const { toast, showToast } = useToast()

  const weekValue = Number(week)
  const validWeek = Number.isFinite(weekValue) && weekValue > 0
  const canEvaluate = validWeek && (incoming.length > 0 || outgoing.length > 0)

  function addTo(setter: typeof setIncoming) {
    return (p: PlayerSearchResult) => setter((prev) => [...prev, p])
  }
  function removeFrom(setter: typeof setIncoming) {
    return (playerId: string) => setter((prev) => prev.filter((p) => p.player_id !== playerId))
  }

  async function submit() {
    setBusy(true)
    setResult(null)
    try {
      const response = await evaluateTrade(
        incoming.map((p) => p.player_id),
        outgoing.map((p) => p.player_id),
        config.season,
        weekValue,
      )
      setResult(response)
    } catch (err) {
      showToast('error', `Failed to evaluate trade: ${String(err)}`)
    } finally {
      setBusy(false)
    }
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
        <Button onClick={submit} loading={busy} disabled={!canEvaluate}>
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

      {result && (
        <div className="trade-result">
          <div className="trade-result-totals">
            <span>Receiving VORP: {result.incoming_total.toFixed(1)}</span>
            <span>Sending VORP: {result.outgoing_total.toFixed(1)}</span>
            <span
              className={result.delta_vorp >= 0 ? 'trade-delta-positive' : 'trade-delta-negative'}
            >
              Net VORP: {result.delta_vorp >= 0 ? '+' : ''}
              {result.delta_vorp.toFixed(1)}
            </span>
          </div>
          {result.missing_player_ids.length > 0 && (
            <Alert color="yellow" mt="sm">
              No VORP data for {result.missing_player_ids.length} player(s) - excluded from totals
              above.
            </Alert>
          )}
        </div>
      )}

      {toast && <p className={`status-message toast toast-${toast.tone}`}>{toast.message}</p>}
    </section>
  )
}
